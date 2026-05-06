-- infra/timescale/init.sql
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS devices (
  imei TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS positions (
  time        TIMESTAMPTZ NOT NULL,
  imei        TEXT        NOT NULL,
  lat         DOUBLE PRECISION NOT NULL,
  lon         DOUBLE PRECISION NOT NULL,
  speed_kph   INTEGER     NOT NULL,
  course      INTEGER     NOT NULL,
  satellites  INTEGER,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (imei, time)
);

-- Turn positions into a hypertable (Timescale time-series magic)
SELECT create_hypertable('positions', 'time', if_not_exists => TRUE);

-- Index for fast playback queries per vehicle
CREATE INDEX IF NOT EXISTS positions_imei_time_idx ON positions (imei, time DESC);
