-- ======================================================================
-- ArtXenith HRIS - Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Migration File: 20260902_init_rls.sql
-- ======================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------
-- 1. DATABASE SECURITY HELPER FUNCTIONS
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public."User"
  WHERE id = auth.uid()::text;
  
  RETURN COALESCE(user_role, 'Employee');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS text AS $$
DECLARE
  emp_id text;
BEGIN
  SELECT id INTO emp_id
  FROM public."Employee"
  WHERE "userId" = auth.uid()::text;
  
  RETURN emp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN public.get_current_user_role() IN ('Admin', 'CEO', 'COO');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_team_lead()
RETURNS boolean AS $$
BEGIN
  RETURN public.get_current_user_role() = 'Team Lead';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_team_member(target_emp_id text)
RETURNS boolean AS $$
DECLARE
  current_emp text := public.get_current_employee_id();
  is_member boolean := false;
BEGIN
  IF current_emp IS NULL THEN
    RETURN false;
  END IF;

  -- Self is always a member
  IF current_emp = target_emp_id THEN
    RETURN true;
  END IF;

  -- Check if target_emp_id is in any active campaign led by current_emp
  SELECT EXISTS (
    SELECT 1 
    FROM public."CampaignMember" cm_target
    WHERE cm_target."employeeId" = target_emp_id
      AND cm_target.status = 'active'
      AND cm_target."campaignId" IN (
        SELECT cm_lead."campaignId"
        FROM public."CampaignMember" cm_lead
        WHERE cm_lead."employeeId" = current_emp
          AND cm_lead.role = 'team_lead'
          AND cm_lead.status = 'active'
      )
  ) INTO is_member;

  RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ----------------------------------------------------------------------

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProjectBrief" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProjectStageLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SalePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SalaryPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CampaignMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LeaveRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."HalfdayRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WfhRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LoanRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PayrollRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payslip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Document" ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------
-- 3. RLS POLICIES FOR CORE TABLES
-- ----------------------------------------------------------------------

-- ------------------ USER & PROFILES ------------------
DROP POLICY IF EXISTS "Users_Admin_Full_Access" ON public."User";
CREATE POLICY "Users_Admin_Full_Access" ON public."User"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users_Self_Select" ON public."User";
CREATE POLICY "Users_Self_Select" ON public."User"
  FOR SELECT USING (id = auth.uid()::text);

-- ------------------ EMPLOYEES ------------------
DROP POLICY IF EXISTS "Employee_Admin_Full" ON public."Employee";
CREATE POLICY "Employee_Admin_Full" ON public."Employee"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Employee_TeamLead_Select" ON public."Employee";
CREATE POLICY "Employee_TeamLead_Select" ON public."Employee"
  FOR SELECT USING (public.is_team_member(id));

DROP POLICY IF EXISTS "Employee_Self_Select" ON public."Employee";
CREATE POLICY "Employee_Self_Select" ON public."Employee"
  FOR SELECT USING ("userId" = auth.uid()::text);

-- ------------------ ATTENDANCE ------------------
DROP POLICY IF EXISTS "Attendance_Admin_Full" ON public."Attendance";
CREATE POLICY "Attendance_Admin_Full" ON public."Attendance"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Attendance_TeamLead_Select" ON public."Attendance";
CREATE POLICY "Attendance_TeamLead_Select" ON public."Attendance"
  FOR SELECT USING (public.is_team_member("employeeId"));

DROP POLICY IF EXISTS "Attendance_Employee_Self" ON public."Attendance";
CREATE POLICY "Attendance_Employee_Self" ON public."Attendance"
  FOR ALL USING ("employeeId" = public.get_current_employee_id());

-- ------------------ SALES & PROJECTS ------------------
DROP POLICY IF EXISTS "Sale_Admin_Full" ON public."Sale";
CREATE POLICY "Sale_Admin_Full" ON public."Sale"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Sale_TeamLead_Access" ON public."Sale";
CREATE POLICY "Sale_TeamLead_Access" ON public."Sale"
  FOR ALL USING (public.is_team_member("employeeId"));

DROP POLICY IF EXISTS "Sale_Employee_Self" ON public."Sale";
CREATE POLICY "Sale_Employee_Self" ON public."Sale"
  FOR ALL USING ("employeeId" = public.get_current_employee_id());

-- ------------------ BRIEFS & STAGE LOGS ------------------
DROP POLICY IF EXISTS "Brief_Admin_Full" ON public."ProjectBrief";
CREATE POLICY "Brief_Admin_Full" ON public."ProjectBrief"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Brief_TeamLead_Access" ON public."ProjectBrief";
CREATE POLICY "Brief_TeamLead_Access" ON public."ProjectBrief"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public."Sale" s WHERE s.id = "saleId" AND public.is_team_member(s."employeeId")
  ));

DROP POLICY IF EXISTS "Brief_Employee_Self" ON public."ProjectBrief";
CREATE POLICY "Brief_Employee_Self" ON public."ProjectBrief"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public."Sale" s WHERE s.id = "saleId" AND s."employeeId" = public.get_current_employee_id()
  ));

-- ------------------ FINANCE & EXPENSES (ADMIN STRICT ONLY) ------------------
DROP POLICY IF EXISTS "Expense_Admin_Strict" ON public."Expense";
CREATE POLICY "Expense_Admin_Strict" ON public."Expense"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "SalaryPayment_Admin_Strict" ON public."SalaryPayment";
CREATE POLICY "SalaryPayment_Admin_Strict" ON public."SalaryPayment"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "PayrollRun_Admin_Strict" ON public."PayrollRun";
CREATE POLICY "PayrollRun_Admin_Strict" ON public."PayrollRun"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Payslip_Admin_Full" ON public."Payslip";
CREATE POLICY "Payslip_Admin_Full" ON public."Payslip"
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Payslip_Employee_Self" ON public."Payslip";
CREATE POLICY "Payslip_Employee_Self" ON public."Payslip"
  FOR SELECT USING ("employeeId" = public.get_current_employee_id());

-- ----------------------------------------------------------------------
-- 4. STORAGE BUCKET POLICIES
-- ----------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-briefs', 'project-briefs', false),
       ('payslips', 'payslips', false),
       ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Admin Full
CREATE POLICY "Storage_Admin_Full" ON storage.objects
  FOR ALL USING (public.is_admin());

-- Storage RLS: Authenticated Access
CREATE POLICY "Storage_Auth_Read" ON storage.objects
  FOR SELECT USING (auth.role() = 'authenticated');
