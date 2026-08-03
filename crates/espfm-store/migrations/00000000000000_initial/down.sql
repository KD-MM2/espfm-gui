-- Diesel migration rollback (not used for embedded app, but complete for correctness)

DROP TABLE IF EXISTS temp_samples_5m;
DROP TABLE IF EXISTS fan_samples_5m;
DROP TABLE IF EXISTS temp_samples_1m;
DROP TABLE IF EXISTS fan_samples_1m;
DROP TABLE IF EXISTS app_state;
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS temp_samples;
DROP TABLE IF EXISTS fan_samples;
DROP TABLE IF EXISTS devices;
