const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const db = require('../db');
const verifyToken = require('../middleware/auth');

// Initialize OpenAI conditionally
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
}

router.use(verifyToken);

// Tools definition
const tools = [
    {
        type: "function",
        function: {
            name: "getPendingTasks",
            description: "Retrieve all pending tasks from the database. Optionally specify a category or urgency.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "integer", description: "Limit number of tasks returned" }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createTask",
            description: "Create a new task in the system.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "The title of the task" },
                    description: { type: "string", description: "A detailed description of the task" },
                    urgency: { type: "string", enum: ["low", "medium", "high"], description: "The urgency of the task" }
                },
                required: ["title", "urgency"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getAccountingSummary",
            description: "Retrieve the current accounting balances (accounts and entities balances).",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getClientsList",
            description: "Retrieve a list of clients from the database.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "integer", description: "Optional limit for number of clients to fetch" }
                },
                required: []
            }
        }
    }
];

// Tool Implementation Map
async function executeTool(toolName, args, req) {
    console.log(`[AI TOOL] Executing ${toolName} with args:`, args);
    switch (toolName) {
        case 'getPendingTasks':
            if (db.isFirebase) {
                let snap = await db.collection('tasks').where('status', '==', 'pending').get();
                let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Limit for context size
                if (args.limit) tasks = tasks.slice(0, args.limit);
                else tasks = tasks.slice(0, 10);
                return JSON.stringify(tasks.map(t => ({ title: t.title, urgency: t.urgency, id: t.id })));
            } else {
                return new Promise((resolve) => {
                    db.all("SELECT id, title, urgency, due_date FROM tasks WHERE status = 'pending' LIMIT ?", [args.limit || 10], (err, rows) => {
                        if (err) resolve(JSON.stringify({ error: err.message }));
                        else resolve(JSON.stringify(rows));
                    });
                });
            }

        case 'createTask':
            if (db.isFirebase) {
                const newTask = {
                    title: args.title,
                    description: args.description || "",
                    urgency: args.urgency || "medium",
                    status: "pending",
                    created_by: req.userId,
                    created_at: new Date().toISOString(),
                    recurrence: "none"
                };
                const docRef = await db.collection('tasks').add(newTask);
                req.app.get('io').emit('tasks_updated');
                return JSON.stringify({ success: true, taskId: docRef.id, message: "Task created successfully." });
            } else {
                return new Promise((resolve) => {
                    db.run(
                        "INSERT INTO tasks (title, description, urgency, status, created_by, recurrence) VALUES (?, ?, ?, 'pending', ?, 'none')",
                        [args.title, args.description || "", args.urgency || "medium", req.userId],
                        function (err) {
                            if (err) resolve(JSON.stringify({ error: err.message }));
                            else {
                                req.app.get('io').emit('tasks_updated');
                                resolve(JSON.stringify({ success: true, taskId: this.lastID, message: "Task created successfully." }));
                            }
                        }
                    );
                });
            }

        case 'getAccountingSummary':
            if (db.isFirebase) {
                try {
                    const snap = await db.collection('accounting_entries').get();
                    let balances = {};
                    snap.docs.forEach(doc => {
                        doc.data().items.forEach(item => {
                            if (!balances[item.accountId]) balances[item.accountId] = { debit: 0, credit: 0 };
                            balances[item.accountId].debit += parseFloat(item.debit) || 0;
                            balances[item.accountId].credit += parseFloat(item.credit) || 0;
                        });
                    });
                    return JSON.stringify(balances); // Might need formatting for LLM
                } catch (e) { return JSON.stringify({ error: e.message }); }
            } else {
                return JSON.stringify({ message: "Accounting not implemented in SQLite yet." });
            }

        case 'getClientsList':
            if (db.isFirebase) {
                const snap = await db.collection('hub_clients').limit(args.limit || 10).get();
                const clients = snap.docs.map(doc => ({ name: doc.data().name, email: doc.data().email }));
                return JSON.stringify(clients);
            } else {
                return new Promise((resolve) => {
                    db.all("SELECT name, email FROM hub_clients LIMIT ?", [args.limit || 10], (err, rows) => {
                        if (err) resolve(JSON.stringify({ error: err.message }));
                        else resolve(JSON.stringify(rows));
                    });
                });
            }

        default:
            return JSON.stringify({ error: "Unknown tool" });
    }
}

router.post('/chat', async (req, res) => {
    if (!openai) {
        return res.status(500).json({ error: 'OpenAI API key no configurada. Por favor, añádela al archivo .env.' });
    }

    const { messages, context } = req.body;
    // context from frontend (e.g., current page, selected item)

    const systemPrompt = `Eres un asistente de inteligencia artificial integrado en una aplicación de gestión empresarial llamada "Workflow". 
Tu propósito es ayudar al usuario (${req.userRole}) a gestionar sus datos, cargar tareas y consultar información rápida.
El usuario actualmente se encuentra en la sección: ${context || 'General'}.
Puedes acceder a la base de datos usando las herramientas proporcionadas. Usa funciones para responder consultas sobre estado financiero, tareas pendientes o listar clientes. Si el usuario te pide crear una tarea, usa la herramienta createTask. Sé conciso y profesional. Responde en español.`;

    try {
        const fullMessages = [
            { role: "system", content: systemPrompt },
            ...messages
        ];

        console.log('[AI] Starting chat completion...');
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Using mini for speed and cost, adjust if needed
            messages: fullMessages,
            tools: tools,
            tool_choice: "auto"
        });

        let responseMessage = response.choices[0].message;

        // Handle tool calls
        if (responseMessage.tool_calls) {
            const availableFunctions = {
                getPendingTasks: executeTool,
                createTask: executeTool,
                getAccountingSummary: executeTool,
                getClientsList: executeTool
            };

            fullMessages.push(responseMessage);

            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                let functionArgs = {};
                try {
                    functionArgs = JSON.parse(toolCall.function.arguments);
                } catch (e) {
                    console.log("[AI] Bad args:", toolCall.function.arguments);
                }
                const functionResponse = await executeTool(functionName, functionArgs, req);

                fullMessages.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: functionName,
                    content: functionResponse,
                });
            }

            // Second LLM call with tool results
            const secondResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: fullMessages,
            });

            return res.json({ message: { role: 'assistant', content: secondResponse.choices[0].message.content || '...' } });
        }

        res.json({ message: { role: 'assistant', content: responseMessage.content || 'No response.' } });

    } catch (error) {
        console.error('[AI ERROR]', error);
        res.status(500).json({ error: "Failed to process AI request: " + error.message });
    }
});

module.exports = router;
