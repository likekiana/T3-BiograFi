const { pool } = require('../config/database');

class LocationGeocodeModel {
    // 查询地名坐标缓存
    static async findByName(name) {
        const [rows] = await pool.execute(
            'SELECT * FROM location_geocodes WHERE name = ?',
            [name]
        );
        return rows[0];
    }

    // 更新或创建地名坐标缓存
    static async upsertLocation(name, { lng, lat, matchedName, confidence }) {
        const existing = await this.findByName(name);
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        if (existing) {
            // 更新现有记录
            const [result] = await pool.execute(
                'UPDATE location_geocodes SET lng = ?, lat = ?, matched_name = ?, confidence = ?, updated_at = ? WHERE id = ?',
                [lng, lat, matchedName, confidence, now, existing.id]
            );
            return result.affectedRows > 0;
        } else {
            // 创建新记录
            const [result] = await pool.execute(
                'INSERT INTO location_geocodes (name, lng, lat, matched_name, confidence, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                [name, lng, lat, matchedName, confidence, now]
            );
            return result.insertId;
        }
    }
}

module.exports = LocationGeocodeModel;