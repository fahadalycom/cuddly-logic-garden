CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activity(task_id, actor_id, event_type, to_value, note)
    VALUES (NEW.id, NEW.created_by, 'created', NEW.status::text, NEW.title);
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.task_activity(task_id, actor_id, event_type, to_value)
      VALUES (NEW.id, NEW.created_by, 'assigned', NEW.assigned_to::text);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.task_activity(task_id, actor_id, event_type, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status::text, NEW.status::text);
      IF NEW.status = 'done' AND OLD.status <> 'done' THEN
        NEW.completed_at := now();
        INSERT INTO public.task_activity(task_id, actor_id, event_type)
        VALUES (NEW.id, auth.uid(), 'completed');
      END IF;
    END IF;
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      INSERT INTO public.task_activity(task_id, actor_id, event_type, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'priority_changed', OLD.priority::text, NEW.priority::text);
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.task_activity(task_id, actor_id, event_type, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'reassigned',
              COALESCE(OLD.assigned_to::text,'unassigned'),
              COALESCE(NEW.assigned_to::text,'unassigned'));
    END IF;
  END IF;
  RETURN NEW;
END $$;