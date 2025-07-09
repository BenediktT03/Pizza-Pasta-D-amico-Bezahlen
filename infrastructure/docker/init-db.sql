-- EATECH V3.0 - PostgreSQL Initialization Script
-- This script sets up the initial database schema for analytics and reporting

-- Create database if not exists (handled by docker-compose environment variables)
-- CREATE DATABASE eatech;

-- Switch to eatech database
\c eatech;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS reports;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set search path
SET search_path TO public, analytics, reports, audit;

-- Create tables for analytics
CREATE TABLE IF NOT EXISTS analytics.page_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    page_path VARCHAR(500) NOT NULL,
    page_title VARCHAR(500),
    referrer VARCHAR(1000),
    user_agent VARCHAR(1000),
    ip_address INET,
    country_code VARCHAR(2),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics.events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_category VARCHAR(255),
    event_value JSONB,
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics.conversion_funnel (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    funnel_name VARCHAR(255) NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    step_order INTEGER NOT NULL,
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    completed BOOLEAN DEFAULT FALSE,
    time_spent_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tables for reports
CREATE TABLE IF NOT EXISTS reports.daily_summary (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    report_date DATE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    average_order_value DECIMAL(10, 2) DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    top_products JSONB,
    payment_methods JSONB,
    order_times JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, report_date)
);

CREATE TABLE IF NOT EXISTS reports.monthly_summary (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    report_year INTEGER NOT NULL,
    report_month INTEGER NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    average_order_value DECIMAL(10, 2) DEFAULT 0,
    customer_metrics JSONB,
    product_performance JSONB,
    revenue_by_category JSONB,
    growth_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, report_year, report_month)
);

CREATE TABLE IF NOT EXISTS reports.inventory_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    current_stock INTEGER NOT NULL,
    min_stock_level INTEGER NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'low_stock', 'out_of_stock', 'expiring_soon'
    alert_severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit tables
CREATE TABLE IF NOT EXISTS audit.api_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id VARCHAR(255),
    user_id VARCHAR(255),
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_body TEXT,
    response_body TEXT,
    ip_address INET,
    user_agent VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit.system_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type VARCHAR(255) NOT NULL,
    event_source VARCHAR(255) NOT NULL,
    event_data JSONB,
    severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'critical'
    tenant_id VARCHAR(255),
    user_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit.data_changes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    record_id VARCHAR(255) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(255),
    change_reason VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_page_views_tenant_created ON analytics.page_views(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON analytics.page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_events_tenant_name_created ON analytics.events(tenant_id, event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_summary_tenant_date ON reports.daily_summary(tenant_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_summary_tenant_year_month ON reports.monthly_summary(tenant_id, report_year DESC, report_month DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_tenant_resolved ON reports.inventory_alerts(tenant_id, resolved);
CREATE INDEX IF NOT EXISTS idx_api_requests_tenant_created ON audit.api_requests(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_severity_created ON audit.system_events(severity, created_at DESC);

-- Create views for common queries
CREATE OR REPLACE VIEW analytics.hourly_orders AS
SELECT 
    tenant_id,
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as order_count,
    SUM((event_value->>'total')::DECIMAL) as revenue
FROM analytics.events
WHERE event_name = 'order_completed'
GROUP BY tenant_id, hour;

CREATE OR REPLACE VIEW reports.top_products_last_30_days AS
SELECT 
    tenant_id,
    event_value->>'product_id' as product_id,
    event_value->>'product_name' as product_name,
    COUNT(*) as order_count,
    SUM((event_value->>'quantity')::INTEGER) as total_quantity,
    SUM((event_value->>'revenue')::DECIMAL) as total_revenue
FROM analytics.events
WHERE event_name = 'product_ordered'
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tenant_id, product_id, product_name
ORDER BY total_revenue DESC;

-- Create functions for report generation
CREATE OR REPLACE FUNCTION reports.generate_daily_summary(p_tenant_id VARCHAR, p_date DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO reports.daily_summary (
        tenant_id,
        report_date,
        total_orders,
        total_revenue,
        average_order_value,
        new_customers,
        returning_customers,
        top_products,
        payment_methods,
        order_times
    )
    SELECT 
        p_tenant_id,
        p_date,
        COUNT(DISTINCT CASE WHEN event_name = 'order_completed' THEN event_value->>'order_id' END),
        COALESCE(SUM(CASE WHEN event_name = 'order_completed' THEN (event_value->>'total')::DECIMAL END), 0),
        COALESCE(AVG(CASE WHEN event_name = 'order_completed' THEN (event_value->>'total')::DECIMAL END), 0),
        COUNT(DISTINCT CASE WHEN event_name = 'new_customer' THEN user_id END),
        COUNT(DISTINCT CASE WHEN event_name = 'returning_customer' THEN user_id END),
        '[]'::JSONB, -- Placeholder, would be populated with actual logic
        '[]'::JSONB, -- Placeholder
        '[]'::JSONB  -- Placeholder
    FROM analytics.events
    WHERE tenant_id = p_tenant_id
        AND DATE(created_at) = p_date
    ON CONFLICT (tenant_id, report_date) 
    DO UPDATE SET
        total_orders = EXCLUDED.total_orders,
        total_revenue = EXCLUDED.total_revenue,
        average_order_value = EXCLUDED.average_order_value,
        new_customers = EXCLUDED.new_customers,
        returning_customers = EXCLUDED.returning_customers,
        created_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create materialized views for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.customer_lifetime_value AS
SELECT 
    tenant_id,
    user_id,
    MIN(created_at) as first_order_date,
    MAX(created_at) as last_order_date,
    COUNT(DISTINCT event_value->>'order_id') as total_orders,
    SUM((event_value->>'total')::DECIMAL) as lifetime_value,
    AVG((event_value->>'total')::DECIMAL) as average_order_value
FROM analytics.events
WHERE event_name = 'order_completed'
    AND user_id IS NOT NULL
GROUP BY tenant_id, user_id;

-- Create refresh function for materialized views
CREATE OR REPLACE FUNCTION analytics.refresh_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.customer_lifetime_value;
END;
$$ LANGUAGE plpgsql;

-- Set up permissions
GRANT ALL PRIVILEGES ON SCHEMA analytics TO eatech_user;
GRANT ALL PRIVILEGES ON SCHEMA reports TO eatech_user;
GRANT ALL PRIVILEGES ON SCHEMA audit TO eatech_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA analytics TO eatech_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA reports TO eatech_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit TO eatech_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA analytics TO eatech_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA reports TO eatech_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA audit TO eatech_user;

-- Create scheduled job to refresh materialized views (requires pg_cron extension)
-- SELECT cron.schedule('refresh-materialized-views', '0 */6 * * *', 'SELECT analytics.refresh_materialized_views();');

-- Initial data seed for development
-- This section only runs in development environments
DO $$
BEGIN
    IF current_database() = 'eatech' AND current_setting('server_version_num')::integer < 150000 THEN
        -- Insert sample data for development
        RAISE NOTICE 'Development environment detected. Inserting sample data...';
        
        -- Sample analytics data
        INSERT INTO analytics.events (tenant_id, event_name, event_category, event_value, user_id)
        VALUES 
            ('demo-tenant', 'page_view', 'navigation', '{"page": "/menu"}'::JSONB, 'demo-user-1'),
            ('demo-tenant', 'order_completed', 'conversion', '{"order_id": "123", "total": 45.50}'::JSONB, 'demo-user-1');
    END IF;
END $$;

-- Add table comments for documentation
COMMENT ON TABLE analytics.page_views IS 'Stores page view analytics for all tenants';
COMMENT ON TABLE analytics.events IS 'Generic event tracking table for custom analytics';
COMMENT ON TABLE reports.daily_summary IS 'Pre-aggregated daily reports for performance';
COMMENT ON TABLE audit.api_requests IS 'API request logging for debugging and compliance';
