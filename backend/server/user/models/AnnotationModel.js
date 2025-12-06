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

    static async addEntitiesBulk(documentId, annotations) {
        try {
            const values = annotations.map(ann => [
                documentId, 
                ann.start, 
                ann.end, 
                ann.label, 
                ann.text || null
            ]);
            
            const [result] = await pool.execute(
                'INSERT INTO entity_annotations (document_id, start_index, end_index, label, text_content, created_at) VALUES ?',
                [values.map(v => [...v, new Date()])]
            );
            
            // 获取所有添加的实体
            const [rows] = await pool.execute(
                'SELECT id, start_index AS start, end_index AS end, label, text_content AS text, created_at FROM entity_annotations WHERE document_id = ? ORDER BY id DESC LIMIT ?',
                [documentId, annotations.length]
            );
            
            return rows;
        } catch (err) {
            console.error('批量添加实体标注错误:', err);
            throw err;
        }
    }

    static async deleteEntity(documentId, annotationId) {
        const [result] = await pool.execute(
            'DELETE FROM entity_annotations WHERE id = ? AND document_id = ?',
            [annotationId, documentId]
        );
        return result.affectedRows > 0;
    }

    static async searchEntities(documentId, { label, text }) {
        try {
            let query = 'SELECT id, start_index AS start, end_index AS end, label, text_content AS text, created_at FROM entity_annotations WHERE document_id = ?';
            const params = [documentId];
            
            if (label) {
                query += ' AND label = ?';
                params.push(label);
            }
            
            if (text) {
                query += ' AND text_content LIKE ?';
                params.push(`%${text}%`);
            }
            
            query += ' ORDER BY start_index ASC';
            
            const [rows] = await pool.execute(query, params);
            return rows;
        } catch (err) {
            return [];
        }
    }

    static async countEntitiesByLabel(documentId) {
        try {
            const [rows] = await pool.execute(
                'SELECT label, COUNT(*) AS count FROM entity_annotations WHERE document_id = ? GROUP BY label',
                [documentId]
            );
            
            const counts = {};
            rows.forEach(row => {
                counts[row.label] = row.count;
            });
            
            return counts;
        } catch (err) {
            return {};
        }
    }
}

module.exports = AnnotationModel;
