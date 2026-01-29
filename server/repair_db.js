const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'workflow.db'));

db.serialize(() => {
    console.log('Starting data repair...');

    // Grouping strategy: 
    // For tasks with the same title and recurrence != 'none'
    // Find the one with the smallest ID and set it as the parent for others (if they don't have one)

    db.all('SELECT title, COUNT(*) as count FROM tasks WHERE recurrence != "none" GROUP BY title HAVING count > 1', [], (err, series) => {
        if (err) return console.error(err);

        series.forEach(s => {
            db.all('SELECT id, parent_id FROM tasks WHERE title = ? AND recurrence != "none" ORDER BY id ASC', [s.title], (err, tasks) => {
                if (err) return console.error(err);

                const firstId = tasks[0].id;
                const tasksToUpdate = tasks.slice(1).filter(t => t.parent_id === null);

                if (tasksToUpdate.length > 0) {
                    const idsToUpdate = tasksToUpdate.map(t => t.id);
                    console.log(`Updating series "${s.title}": Setting parent_id = ${firstId} for tasks [${idsToUpdate.join(', ')}]`);

                    const placeholders = idsToUpdate.map(() => '?').join(',');
                    db.run(`UPDATE tasks SET parent_id = ? WHERE id IN (${placeholders})`, [firstId, ...idsToUpdate], (err) => {
                        if (err) console.error(`Error updating "${s.title}":`, err.message);
                    });
                }
            });
        });
    });
});

// We'll close after a delay to ensure async updates finished (simplified for script)
setTimeout(() => {
    db.close();
    console.log('Repair script finished.');
}, 2000);
