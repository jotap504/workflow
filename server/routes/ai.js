const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const db = require('../db');
const verifyToken = require('../middleware/auth');

// Initialize Gemini conditionally
let ai = null;
if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

router.use(verifyToken);

// Tools definition for Gemini
const tools = [{
    functionDeclarations: [
        {
            name: "getPendingTasks",
            description: "Retrieve all pending tasks from the database. Optionally specify a category or urgency.",
            parameters: {
                type: "OBJECT",
                properties: {
                    limit: { type: "INTEGER", description: "Limit number of tasks returned" }
                },
            }
        },
        {
            name: "createTask",
            description: "Create a new task in the system.",
            parameters: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING", description: "The title of the task" },
                    description: { type: "STRING", description: "A detailed description of the task" },
                    urgency: { type: "STRING", description: "The urgency of the task (low, medium, high)" },
                    due_date: { type: "STRING", description: "The due date for the task in ISO 8601 format (e.g. 2026-02-28T00:00:00Z). Calculate the date based on the user's request, considering today as the current date timezone-independent." }
                },
                required: ["title", "urgency"]
            }
        },
        {
            name: "updateTask",
            description: "Update the status or other details of an existing task.",
            parameters: {
                type: "OBJECT",
                properties: {
                    taskId: { type: "STRING", description: "The ID of the task to update" },
                    status: { type: "STRING", description: "New status: pending, in-progress, or done." },
                    due_date: { type: "STRING", description: "New due date in ISO 8601 format." }
                },
                required: ["taskId"]
            }
        },
        {
            name: "getTaskNotes",
            description: "Retrieve notes/chats for a specific task.",
            parameters: {
                type: "OBJECT",
                properties: {
                    taskId: { type: "STRING", description: "The ID of the task to get notes for" }
                },
                required: ["taskId"]
            }
        },
        {
            name: "getAccountingSummary",
            description: "Retrieve the current accounting balances (accounts and entities balances).",
            parameters: {
                type: "OBJECT",
                properties: {},
            }
        },
        {
            name: "getClientsList",
            description: "Retrieve a list of clients from the database.",
            parameters: {
                type: "OBJECT",
                properties: {
                    limit: { type: "INTEGER", description: "Optional limit for number of clients to fetch" }
                },
            }
        }
    ]
}];

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
                return { tasks: tasks.map(t => ({ title: t.title, urgency: t.urgency, id: t.id })) };
            } else {
                return new Promise((resolve) => {
                    db.all("SELECT id, title, urgency, due_date FROM tasks WHERE status = 'pending' LIMIT ?", [args.limit || 10], (err, rows) => {
                        if (err) resolve({ error: err.message });
                        else resolve({ tasks: rows });
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
                if (args.due_date) newTask.due_date = args.due_date;
                const docRef = await db.collection('tasks').add(newTask);
                req.app.get('io').emit('tasks_updated');
                return { success: true, taskId: docRef.id, message: "Task created successfully." };
            } else {
                return new Promise((resolve) => {
                    db.run(
                        "INSERT INTO tasks (title, description, urgency, status, created_by, recurrence, due_date) VALUES (?, ?, ?, 'pending', ?, 'none', ?)",
                        [args.title, args.description || "", args.urgency || "medium", req.userId, args.due_date || null],
                        function (err) {
                            if (err) resolve({ error: err.message });
                            else {
                                req.app.get('io').emit('tasks_updated');
                                resolve({ success: true, taskId: this.lastID, message: "Task created successfully." });
                            }
                        }
                    );
                });
            }

        case 'updateTask':
            if (db.isFirebase) {
                try {
                    const taskRef = db.collection('tasks').doc(String(args.taskId));
                    const updates = {};
                    if (args.status) updates.status = args.status;
                    if (args.due_date) updates.due_date = args.due_date;

                    if (Object.keys(updates).length > 0) {
                        await taskRef.update(updates);
                        req.app.get('io').emit('tasks_updated');
                    }
                    return { success: true, message: "Task updated successfully." };
                } catch (e) { return { error: e.message }; }
            } else {
                return new Promise((resolve) => {
                    db.run("UPDATE tasks SET status = COALESCE(?, status), due_date = COALESCE(?, due_date) WHERE id = ?",
                        [args.status || null, args.due_date || null, args.taskId], function (err) {
                            if (err) resolve({ error: err.message });
                            else {
                                req.app.get('io').emit('tasks_updated');
                                resolve({ success: true, message: "Task updated successfully." });
                            }
                        });
                });
            }

        case 'getTaskNotes':
            if (db.isFirebase) {
                try {
                    const snap = await db.collection('task_notes').where('task_id', '==', args.taskId).get();
                    const notes = snap.docs.map(doc => doc.data().content);
                    return { notes: notes.length > 0 ? notes : [] };
                } catch (e) { return { error: e.message }; }
            } else {
                return new Promise((resolve) => {
                    db.all("SELECT content, created_at FROM task_notes WHERE task_id = ?", [args.taskId], (err, rows) => {
                        if (err) resolve({ error: err.message });
                        else resolve({ notes: rows });
                    });
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
                    return { balances };
                } catch (e) { return { error: e.message }; }
            } else {
                return { message: "Accounting not implemented in SQLite yet." };
            }

        case 'getClientsList':
            if (db.isFirebase) {
                const snap = await db.collection('hub_clients').limit(args.limit || 10).get();
                const clients = snap.docs.map(doc => ({ name: doc.data().name, email: doc.data().email }));
                return { clients };
            } else {
                return new Promise((resolve) => {
                    db.all("SELECT name, email FROM hub_clients LIMIT ?", [args.limit || 10], (err, rows) => {
                        if (err) resolve({ error: err.message });
                        else resolve({ clients: rows });
                    });
                });
            }

        default:
            return { error: "Unknown tool" };
    }
}

router.post('/chat', async (req, res) => {
    if (!ai) {
        return res.status(500).json({ error: 'LLM no configurada. Por favor, asegúrate de que exista una clave GEMINI_API_KEY.' });
    }

    const { messages, context } = req.body;

    const systemPrompt = `Eres un asistente de inteligencia artificial integrado en una aplicación de gestión empresarial llamada "Workflow". 
Tu propósito es ayudar al usuario (${req.userRole}) a gestionar sus datos, cargar tareas y consultar información rápida.
El usuario actualmente se encuentra en la sección: ${context || 'General'}.
Puedes acceder a la base de datos usando las herramientas proporcionadas. Usa llamadas a funciones para responder consultas sobre estado financiero, tareas pendientes o listar clientes. Si el usuario te pide crear una tarea, usa la herramienta createTask (puedes inferir las fechas para el campo due_date en formato ISO 8601; Ej: Si hoy es 2026-02-27 y pide 'mañana', usa 2026-02-28). Para modificar tareas (ej: cambiar el estado a 'en-progreso'), usa updateTask. Para leer los chats de una tarea, usa getTaskNotes. Sé conciso y profesional. Responde en español y dale siempre la bienvenida al usuario con algo de empatía.`;

    try {
        console.log('[AI] Starting chat completion with Gemini...');
        // Map common message schema onto Gemini format
        const geminiMessages = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content || " " }] // Ensure it's never completely empty
        }));

        let response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: geminiMessages,
            config: {
                systemInstruction: systemPrompt,
                tools: tools,
                temperature: 0.1,
            }
        });

        const call = response.functionCalls?.[0]; // Single-turn or first tool call
        let finalTextResponse = response.text;

        // Handle tool calls
        if (call) {
            const functionName = call.name;
            const functionArgs = call.args || {};

            const functionResponse = await executeTool(functionName, functionArgs, req);

            // Return result to Gemini
            const nextContents = [
                ...geminiMessages,
                {
                    role: 'model',
                    parts: [{ functionCall: { name: functionName, args: functionArgs } }]
                },
                {
                    role: 'user',
                    parts: [{ functionResponse: { name: functionName, response: functionResponse } }]
                }
            ];

            const secondResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: nextContents,
                config: { systemInstruction: systemPrompt }
            });

            finalTextResponse = secondResponse.text;
        }

        res.json({ message: { role: 'assistant', content: finalTextResponse || '...' } });

    } catch (error) {
        console.error('[AI ERROR]', error);
        res.status(500).json({ error: "Failed to process AI request: " + error.message });
    }
});

module.exports = router;

