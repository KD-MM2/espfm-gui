use diesel::prelude::*;

use crate::models::NewAppState;
use crate::schema::app_state;

pub fn set_app_state(conn: &mut SqliteConnection, key_str: &str, value_str: &str) -> QueryResult<usize> {
    diesel::insert_into(app_state::table)
        .values(&NewAppState {
            key: key_str.to_string(),
            value: value_str.to_string(),
        })
        .on_conflict(app_state::key)
        .do_update()
        .set(app_state::value.eq(value_str))
        .execute(conn)
}

pub fn get_app_state(conn: &mut SqliteConnection, key_str: &str) -> QueryResult<Option<String>> {
    let result = app_state::table
        .filter(app_state::key.eq(key_str))
        .select(app_state::value)
        .first::<String>(conn)
        .optional()?;
    Ok(result)
}

pub fn delete_app_state(conn: &mut SqliteConnection, key_str: &str) -> QueryResult<usize> {
    diesel::delete(app_state::table.filter(app_state::key.eq(key_str))).execute(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    #[test]
    fn test_set_and_get_app_state() {
        let db = Database::open_in_memory().unwrap();
        let mut conn = db.conn();
        set_app_state(&mut conn, "last_active_device", "1").unwrap();
        let val = get_app_state(&mut conn, "last_active_device").unwrap();
        assert_eq!(val, Some("1".to_string()));
    }

    #[test]
    fn test_get_missing_key() {
        let db = Database::open_in_memory().unwrap();
        let mut conn = db.conn();
        let val = get_app_state(&mut conn, "nonexistent").unwrap();
        assert_eq!(val, None);
    }
}
