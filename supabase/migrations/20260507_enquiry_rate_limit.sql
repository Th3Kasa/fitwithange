-- Rate limit: max 5 enquiry submissions per email address per 24 hours.
-- This is the server-side hard limit that cannot be bypassed from the client.

CREATE OR REPLACE FUNCTION public.check_enquiry_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.enquiries
    WHERE email = NEW.email
      AND created_at > NOW() - INTERVAL '24 hours'
  ) >= 5 THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Too many submissions from this email address. Try again tomorrow.',
            ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger first so migration is re-runnable
DROP TRIGGER IF EXISTS enquiry_rate_limit ON public.enquiries;

CREATE TRIGGER enquiry_rate_limit
  BEFORE INSERT ON public.enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.check_enquiry_rate_limit();
