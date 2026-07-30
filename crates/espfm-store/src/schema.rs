// @generated automatically by Diesel CLI.
// This file is auto-generated. Do not edit manually.

diesel::table! {
    devices (id) {
        id -> Integer,
        hostname -> Text,
        ip_address -> Nullable<Text>,
        port -> Nullable<Integer>,
        last_seen -> Nullable<Text>,
        firmware_ver -> Nullable<Text>,
        created_at -> Nullable<Text>,
    }
}

diesel::table! {
    fan_samples (id) {
        id -> Integer,
        device_id -> Integer,
        fan_id -> Integer,
        rpm -> Integer,
        duty -> Double,
        ts -> Text,
    }
}

diesel::table! {
    temp_samples (id) {
        id -> Integer,
        device_id -> Integer,
        source_id -> Integer,
        temp_c -> Double,
        ts -> Text,
    }
}

diesel::table! {
    activity_log (id) {
        id -> Integer,
        device_id -> Integer,
        event_type -> Text,
        message -> Nullable<Text>,
        details -> Nullable<Text>,
        ts -> Text,
    }
}

diesel::table! {
    app_state (key) {
        key -> Text,
        value -> Text,
    }
}

diesel::table! {
    fan_samples_1m (id) {
        id -> Integer,
        device_id -> Integer,
        fan_id -> Integer,
        rpm_avg -> Double,
        rpm_min -> Nullable<Double>,
        rpm_max -> Nullable<Double>,
        duty_avg -> Double,
        ts -> Text,
    }
}

diesel::table! {
    temp_samples_1m (id) {
        id -> Integer,
        device_id -> Integer,
        source_id -> Integer,
        temp_avg -> Double,
        temp_min -> Nullable<Double>,
        temp_max -> Nullable<Double>,
        ts -> Text,
    }
}

diesel::table! {
    fan_samples_5m (id) {
        id -> Integer,
        device_id -> Integer,
        fan_id -> Integer,
        rpm_avg -> Double,
        rpm_min -> Nullable<Double>,
        rpm_max -> Nullable<Double>,
        duty_avg -> Double,
        ts -> Text,
    }
}

diesel::table! {
    temp_samples_5m (id) {
        id -> Integer,
        device_id -> Integer,
        source_id -> Integer,
        temp_avg -> Double,
        temp_min -> Nullable<Double>,
        temp_max -> Nullable<Double>,
        ts -> Text,
    }
}
