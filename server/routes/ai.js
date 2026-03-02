const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const db = require('../db');
const verifyToken = require('../middleware/auth');

// Initialize OpenRouter conditionally
let ai = null;
if (process.env.OPENROUTER_API_KEY) {
    ai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY
    });
}

router.use(verifyToken);

const tools = [
    {
        type: "function",
        function: {
            name: "queryDatabase",
            description: "Retrieve records from any table or collection in the database. Use this to list products, get user details, or find specific records based on conditions.",
            parameters: {
                type: "object",
                properties: {
                    table: { type: "string", description: "The name of the table or collection (e.g., 'products', 'tasks', 'users', 'orders')." },
                    conditions: {
                        type: "array",
                        description: "Optional array of conditions to filter results. Each condition is an object with 'field', 'operator' (e.g., '==', '>', '<', 'in'), and 'value'. Example: [{field: 'status', operator: '==', value: 'pending'}].",
                        items: {
                            type: "object",
                            properties: {
                                field: { type: "string" },
                                operator: { type: "string" },
                                value: { type: "string" }
                            }
                        }
                    },
                    limit: { type: "integer", description: "Limit the number of results (default 10) to avoid overloading context." }
                },
                required: ["table"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createRecord",
            description: "Create a new record in any table or collection.",
            parameters: {
                type: "object",
                properties: {
                    table: { type: "string", description: "The name of the table or collection (e.g., 'tasks', 'products')." },
                    data: {
                        type: "object",
                        description: "A JSON object containing the fields and values for the new record. Example: {title: 'New task', urgency: 'high', status: 'pending'}."
                    }
                },
                required: ["table", "data"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "updateRecord",
            description: "Update an existing record in any table or collection.",
            parameters: {
                type: "object",
                properties: {
                    table: { type: "string", description: "The name of the table or collection." },
                    id: { type: "string", description: "The ID (or string ID for Firebase) of the record to update." },
                    data: {
                        type: "object",
                        description: "A JSON object containing the fields and values to update. Example: {price: 49500, stock: 5}."
                    }
                },
                required: ["table", "id", "data"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "deleteRecord",
            description: "Delete a record from any table or collection.",
            parameters: {
                type: "object",
                properties: {
                    table: { type: "string", description: "The name of the table or collection." },
                    id: { type: "string", description: "The ID of the record to delete." }
                },
                required: ["table", "id"]
            }
        }
    }
];

async function logAiAction(userId, action, tableName, recordId, details) {
    if (db.isFirebase) {
        try {
            await db.collection('ai_action_logs').add({
                user_id: userId,
                action: action,
                table_name: tableName,
                record_id: String(recordId),
                details: JSON.stringify(details),
                created_at: new Date().toISOString()
            });
        } catch (e) {
            console.error('[AI LOGGING ERROR]', e);
        }
    } else {
        return new Promise((resolve) => {
            db.run(
                "INSERT INTO ai_action_logs (user_id, action, table_name, record_id, details) VALUES (?, ?, ?, ?, ?)",
                [userId, action, tableName, String(recordId), JSON.stringify(details)],
                (err) => {
                    if (err) console.error('[AI LOGGING ERROR]', err.message);
                    resolve();
                }
            );
        });
    }
}

// Tool Implementation Map
async function executeTool(toolName, args, req) {
    console.log(`[AI TOOL] Executing ${toolName} with args:`, args);
    const userId = req.userId || 'system';

    switch (toolName) {
        case 'queryDatabase':
            if (db.isFirebase) {
                try {
                    let query = db.collection(args.table);
                    if (args.conditions && args.conditions.length > 0) {
                        args.conditions.forEach(cond => {
                            query = query.where(cond.field, cond.operator, cond.value);
                        });
                    }
                    const snap = await query.limit(args.limit || 10).get();
                    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    return { results };
                } catch (e) { return { error: e.message }; }
            } else {
                return new Promise((resolve) => {
                    let sql = `SELECT * FROM ${args.table}`;
                    let params = [];
                    if (args.conditions && args.conditions.length > 0) {
                        const whereClauses = args.conditions.map(c => {
                            let op = c.operator === '==' ? '=' : c.operator;
                            params.push(c.value);
                            return `${c.field} ${op} ?`;
                        });
                        sql += ` WHERE ` + whereClauses.join(' AND ');
                    }
                    sql += ` LIMIT ?`;
                    params.push(args.limit || 10);

                    db.all(sql, params, (err, rows) => {
                        if (err) resolve({ error: err.message });
                        else resolve({ results: rows });
                    });
                });
            }

        case 'createRecord':
            if (db.isFirebase) {
                try {
                    const docRef = await db.collection(args.table).add({
                        ...args.data,
                        created_at: new Date().toISOString(),
                        created_by: userId
                    });
                    await logAiAction(userId, 'CREATE', args.table, docRef.id, args.data);

                    if (args.table === 'tasks') req.app.get('io').emit('tasks_updated');
                    return { success: true, id: docRef.id, message: "Record created successfully." };
                } catch (e) { return { error: e.message }; }
            } else {
                return new Promise((resolve) => {
                    const keys = Object.keys(args.data);
                    const values = Object.values(args.data);
                    const placeholders = keys.map(() => '?').join(', ');

                    // Add standard columns
                    keys.push('created_by');
                    values.push(userId);
                    const allPlaceholders = placeholders + ', ?';

                    const sql = `INSERT INTO ${args.table} (${keys.join(', ')}) VALUES (${allPlaceholders})`;
                    db.run(sql, values, async function (err) {
                        if (err) resolve({ error: err.message });
                        else {
                            await logAiAction(userId, 'CREATE', args.table, this.lastID, args.data);
                            if (args.table === 'tasks') req.app.get('io').emit('tasks_updated');
                            resolve({ success: true, id: this.lastID, message: "Record created successfully." });
                        }
                    });
                });
            }

        case 'updateRecord':
            if (db.isFirebase) {
                try {
                    const docRef = db.collection(args.table).doc(String(args.id));
                    await docRef.update({
                        ...args.data,
                        updated_at: new Date().toISOString()
                    });
                    await logAiAction(userId, 'UPDATE', args.table, args.id, args.data);

                    if (args.table === 'tasks') req.app.get('io').emit('tasks_updated');
                    return { success: true, message: "Record updated successfully." };
                } catch (e) { return { error: e.message }; }
            } else {
                return new Promise((resolve) => {
                    const keys = Object.keys(args.data);
                    const values = Object.values(args.data);
                    const setClauses = keys.map(k => `${k} = ?`).join(', ');

                    values.push(args.id); // for WHERE clause

                    const sql = `UPDATE ${args.table} SET ${setClauses} WHERE id = ?`;
                    db.run(sql, values, async function (err) {
                        if (err) resolve({ error: err.message });
                        else {
                            await logAiAction(userId, 'UPDATE', args.table, args.id, args.data);
                            if (args.table === 'tasks') req.app.get('io').emit('tasks_updated');
                            resolve({ success: true, message: "Record updated successfully." });
                        }
                    });
                });
            }

        case 'deleteRecord':
            if (db.isFirebase) {
                try {
                    await db.collection(args.table).doc(String(args.id)).delete();
                    await logAiAction(userId, 'DELETE', args.table, args.id, null);

                    if (args.table === 'tasks') req.app.get('io').emit('tasks_updated');
                    return { success: true, message: "Record deleted successfully." };
                } catch (e) { return { error: e.message }; }
            } else {
                return new Promise((resolve) => {
                    const sql = `DELETE FROM ${args.table} WHERE id = ?`;
                    db.run(sql, [args.id], async function (err) {
                        if (err) resolve({ error: err.message });
                        else {
                            await logAiAction(userId, 'DELETE', args.table, args.id, null);
                            if (args.table === 'tasks') req.app.get('io').emit('tasks_updated');
                            resolve({ success: true, message: "Record deleted successfully." });
                        }
                    });
                });
            }

        default:
            return { error: `Unknown tool: ${toolName}` };
    }
}

router.post('/chat', async (req, res) => {
    if (!ai) {
        return res.status(500).json({ error: 'LLM no configurada. Por favor, asegúrate de que exista una clave OPENROUTER_API_KEY en el entorno.' });
    }

    const { messages, context } = req.body;

    const systemPrompt = `Eres un asistente de inteligencia artificial integrado en una aplicación de gestión empresarial llamada "Workflow". 
Tu propósito es ayudar al usuario (${req.userRole}) a gestionar sus datos y hacerle la vida más fácil.
El usuario actualmente se encuentra en la sección: ${context || 'General'}.
Tienes CONTROL TOTAL sobre la base de datos gracias a tus herramientas (queryDatabase, createRecord, updateRecord, deleteRecord). Úsalas para buscar cualquier cosa que el usuario te pida (productos, tareas, clientes, etc.) o para hacer las modificaciones que te ordene.
TONO Y PERSONALIDAD: Sé súper amigable, informal y conversacional. Háblale de tú al usuario, usa emojis de vez en cuando, y sé breve pero con muy buena onda. Nunca suenes como un robot corporativo aburrido. Si el usuario te pide un favor, respóndele como lo haría un colega cercano dispuesto a ayudar.`;

    try {
        console.log('[AI] Starting chat completion with OpenRouter...');
        const apiMessages = [
            { role: "system", content: systemPrompt },
            ...messages.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content || " "
            }))
        ];

        let response = await ai.chat.completions.create({
            model: process.env.OPENROUTER_MODEL || "google/gemini-pro-1.5",
            messages: apiMessages,
            tools: tools,
            temperature: 0.1,
        });

        const responseMessage = response.choices[0].message;
        const call = responseMessage.tool_calls?.[0];
        let finalTextResponse = responseMessage.content;

        // Handle tool calls
        if (call) {
            const functionName = call.function.name;
            const functionArgs = JSON.parse(call.function.arguments || "{}");

            const functionResponse = await executeTool(functionName, functionArgs, req);

            // Return result to OpenRouter
            apiMessages.push(responseMessage);
            apiMessages.push({
                role: 'tool',
                tool_call_id: call.id,
                name: functionName,
                content: JSON.stringify(functionResponse)
            });

            const secondResponse = await ai.chat.completions.create({
                model: process.env.OPENROUTER_MODEL || "google/gemini-pro-1.5",
                messages: apiMessages,
            });

            finalTextResponse = secondResponse.choices[0].message.content;
        }

        res.json({ message: { role: 'assistant', content: finalTextResponse || '...' } });

    } catch (error) {
        console.error('[AI ERROR]', error);
        res.status(500).json({ error: "Failed to process AI request: " + error.message });
    }
});

module.exports = router;

