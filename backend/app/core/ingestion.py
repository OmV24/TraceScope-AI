"""
TraceScope Telemetry Ingestion Engine
Parses and normalizes Sysmon / Windows Event Log streams (Mordor schema & raw JSON).
Extracts temporal causality keys: ProcessGuid, ParentProcessGuid, UtcTime, Network, File operations.
"""

import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from dateutil import parser as date_parser


class NormalizedEvent:
    def __init__(
        self,
        event_id: int,
        timestamp: datetime,
        process_guid: str,
        image: str,
        event_type: str,
        pid: Optional[int] = None,
        parent_process_guid: Optional[str] = None,
        parent_image: Optional[str] = None,
        parent_pid: Optional[int] = None,
        command_line: Optional[str] = None,
        user: Optional[str] = None,
        destination_ip: Optional[str] = None,
        destination_port: Optional[int] = None,
        target_filename: Optional[str] = None,
        hashes: Optional[Dict[str, str]] = None,
        raw_event: Optional[Dict[str, Any]] = None
    ):
        self.event_id = event_id
        self.timestamp = timestamp
        self.process_guid = process_guid
        self.image = image
        self.event_type = event_type
        self.pid = pid
        self.parent_process_guid = parent_process_guid
        self.parent_image = parent_image
        self.parent_pid = parent_pid
        self.command_line = command_line
        self.user = user
        self.destination_ip = destination_ip
        self.destination_port = destination_port
        self.target_filename = target_filename
        self.hashes = hashes or {}
        self.raw_event = raw_event or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp.isoformat(),
            "process_guid": self.process_guid,
            "image": self.image,
            "event_type": self.event_type,
            "pid": self.pid,
            "parent_process_guid": self.parent_process_guid,
            "parent_image": self.parent_image,
            "parent_pid": self.parent_pid,
            "command_line": self.command_line,
            "user": self.user,
            "destination_ip": self.destination_ip,
            "destination_port": self.destination_port,
            "target_filename": self.target_filename,
            "hashes": self.hashes
        }


class TelemetryIngestor:
    """Ingests, parses, and normalizes Windows/Sysmon telemetry from JSON lines or Mordor streams."""

    @staticmethod
    def _extract_event_data(record: Dict[str, Any]) -> Dict[str, Any]:
        """Extract event fields whether nested in EventData, event_data, winlog, or flat."""
        if "Event" in record and isinstance(record["Event"], dict):
            event = record["Event"]
            return event.get("EventData", {}) or event.get("event_data", {})
        if "event_data" in record:
            return record["event_data"]
        if "EventData" in record:
            return record["EventData"]
        if "winlog" in record and "event_data" in record["winlog"]:
            return record["winlog"]["event_data"]
        return record

    @staticmethod
    def _parse_time(time_val: Any) -> datetime:
        """Parses various timestamp representations into a Python datetime."""
        if isinstance(time_val, datetime):
            return time_val
        if isinstance(time_val, (int, float)):
            return datetime.utcfromtimestamp(time_val)
        if isinstance(time_val, str):
            try:
                return date_parser.parse(time_val)
            except Exception:
                pass
        return datetime.utcnow()

    @classmethod
    def normalize_record(cls, record: Dict[str, Any]) -> Optional[NormalizedEvent]:
        """Maps a raw Sysmon record into a NormalizedEvent."""
        data = cls._extract_event_data(record)

        # Sysmon Event ID
        event_id_raw = (
            data.get("EventID")
            or record.get("EventID")
            or record.get("winlog", {}).get("event_id")
            or record.get("event", {}).get("code")
        )
        try:
            event_id = int(event_id_raw)
        except (TypeError, ValueError):
            return None

        # Time
        raw_time = (
            data.get("UtcTime")
            or record.get("@timestamp")
            or record.get("TimeCreated", {}).get("SystemTime")
            or data.get("CreationUtcTime")
        )
        timestamp = cls._parse_time(raw_time)

        # Process GUID
        process_guid = data.get("ProcessGuid") or data.get("SourceProcessGuid")
        if not process_guid:
            return None  # Cannot participate in graph without ProcessGuid

        image = data.get("Image") or data.get("SourceImage") or "unknown.exe"
        pid = int(data.get("ProcessId", 0)) if data.get("ProcessId") else None
        user = data.get("User")

        # Event ID 1: Process Creation
        if event_id == 1:
            return NormalizedEvent(
                event_id=1,
                timestamp=timestamp,
                process_guid=process_guid,
                image=image,
                event_type="PROCESS_CREATE",
                pid=pid,
                parent_process_guid=data.get("ParentProcessGuid"),
                parent_image=data.get("ParentImage"),
                parent_pid=int(data.get("ParentProcessId", 0)) if data.get("ParentProcessId") else None,
                command_line=data.get("CommandLine"),
                user=user,
                hashes={"sha256": data.get("Hashes", "")},
                raw_event=record
            )

        # Event ID 3: Network Connection
        elif event_id == 3:
            return NormalizedEvent(
                event_id=3,
                timestamp=timestamp,
                process_guid=process_guid,
                image=image,
                event_type="NETWORK_CONNECT",
                pid=pid,
                destination_ip=data.get("DestinationIp"),
                destination_port=int(data.get("DestinationPort", 0)) if data.get("DestinationPort") else None,
                user=user,
                raw_event=record
            )

        # Event ID 11: File Creation
        elif event_id == 11:
            return NormalizedEvent(
                event_id=11,
                timestamp=timestamp,
                process_guid=process_guid,
                image=image,
                event_type="FILE_CREATE",
                pid=pid,
                target_filename=data.get("TargetFilename"),
                user=user,
                raw_event=record
            )

        # Event ID 12, 13: Registry Modification
        elif event_id in (12, 13, 14):
            return NormalizedEvent(
                event_id=event_id,
                timestamp=timestamp,
                process_guid=process_guid,
                image=image,
                event_type="REGISTRY_MODIFY",
                pid=pid,
                target_filename=data.get("TargetObject"),
                user=user,
                raw_event=record
            )

        return None

    @classmethod
    def load_from_json_file(cls, filepath: str) -> List[NormalizedEvent]:
        """Loads and sorts events chronologically from a JSON/JSONL file."""
        events: List[NormalizedEvent] = []
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    norm = cls.normalize_record(record)
                    if norm:
                        events.append(norm)
                except Exception:
                    continue
        events.sort(key=lambda x: x.timestamp)
        return events
