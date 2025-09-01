-- 修改prescriptions表的total_quantity字段为NUMERIC类型以支持小数
ALTER TABLE prescriptions 
ALTER COLUMN total_quantity TYPE NUMERIC(10,2);