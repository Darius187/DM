"""MQTT-Verbindungs-Settings (Broker auf dem Esprimo)."""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class MQTTSettings(BaseSettings):
    """Verbindungs-Parameter zum Mosquitto-Broker.

    Beispiel ``.env``:

        JOHNNY5_MQTT_HOST=192.168.1.42
        JOHNNY5_MQTT_PORT=1883
        JOHNNY5_MQTT_RECONNECT_INTERVAL_S=5.0
    """

    model_config = SettingsConfigDict(
        env_prefix="JOHNNY5_MQTT_",
        env_file=".env",
        env_file_encoding="utf-8",
        frozen=True,
        extra="ignore",
    )

    host: str = "localhost"
    port: int = Field(default=1883, ge=1, le=65535)
    username: str | None = None
    password: str | None = None
    keepalive_s: int = Field(default=60, ge=5, le=600)
    reconnect_interval_s: float = Field(default=5.0, gt=0.0, le=60.0)
    client_id_prefix: str = "johnny5"
