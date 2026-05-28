CREATE TABLE regulatory_sources (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    scan_interval_hours INTEGER DEFAULT 6,
    last_scan_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES regulatory_sources(id),
    content_hash TEXT NOT NULL,
    raw_html TEXT,
    scraped_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES regulatory_sources(id),
    document_id INTEGER REFERENCES documents(id),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    summary TEXT NOT NULL,
    impacted_depts TEXT,
    remediation_steps TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_source_id ON documents(source_id);
CREATE INDEX idx_alerts_source_id ON alerts(source_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
