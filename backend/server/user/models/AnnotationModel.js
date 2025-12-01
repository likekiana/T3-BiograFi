const { pool } = require('../config/database');

class AnnotationModel {
    static async listEntities(documentId) {
        try {
            const [rows] = await pool.execute(
                'SELECT id, start_index AS start, end_index AS end, label, text_content AS text, created_at FROM entity_annotations WHERE document_id = ? ORDER BY start_index ASC',
                [documentId]
            );
            return rows;
        } catch (err) {
            try {
                const [docs] = await pool.execute(
                    'SELECT entityAnnotations FROM documents WHERE id = ?',
                    [documentId]
                );
                if (!docs.length) return [];
                const raw = docs[0].entityAnnotations;
                if (!raw) return [];
                let arr = [];
                try {
                    arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    if (!Array.isArray(arr)) arr = [];
                } catch { arr = []; }
                return arr.map((x, i) => ({ id: x.id || i, start: x.start, end: x.end, label: x.label, text: x.text }));
            } catch (e2) {
                return [];
            }
        }
    }

    static async addEntity(documentId, { start, end, label, text }) {
        const [result] = await pool.execute(
            'INSERT INTO entity_annotations (document_id, start_index, end_index, label, text_content, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [documentId, start, end, label, text || null]
        );
        const [rows] = await pool.execute(
            'SELECT id, start_index AS start, end_index AS end, label, text_content AS text, created_at FROM entity_annotations WHERE id = ?',
            [result.insertId]
        );
        return rows[0];
    }

    static async deleteEntity(documentId, annotationId) {
        const [result] = await pool.execute(
            'DELETE FROM entity_annotations WHERE id = ? AND document_id = ?',
            [annotationId, documentId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = AnnotationModel;
