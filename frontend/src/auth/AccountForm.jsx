import { useRef, useState } from 'react';

export default function AccountForm({ fields, submitLabel, pendingLabel, onSubmit, initialMessage = '' }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(({ name }) => [name, ''])));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(initialMessage);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const formRef = useRef(null);
  const focusError = (nextErrors) => {
    const field = fields.find(({ name }) => nextErrors[name]);
    if (field) formRef.current.elements.namedItem(field.name)?.focus();
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy.current) return;
    const nextErrors = {};
    for (const field of fields) {
      const value = values[field.name];
      if (!value.trim()) nextErrors[field.name] = `${field.label} is required.`;
      else if (field.validate) {
        const error = field.validate(value);
        if (error) nextErrors[field.name] = error;
      }
    }
    setErrors(nextErrors);
    setMessage('');
    if (Object.keys(nextErrors).length) { focusError(nextErrors); return; }
    busy.current = true;
    setPending(true);
    try {
      await onSubmit(values);
    } catch (error) {
      const data = error.response?.data;
      const fieldErrors = data?.errors || {};
      setErrors(fieldErrors);
      setMessage(data?.message || 'Could not connect. Check your connection and try again.');
      focusError(fieldErrors);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <form ref={formRef} onSubmit={submit} noValidate aria-busy={pending} className="mt-4 space-y-4">
      {message && <p role="status" aria-live="polite" className="text-sm text-zinc-100">{message}</p>}
      {fields.map(({ name, label, type = 'text', autoComplete, hint, maxLength }) => (
        <div key={name}>
          <label htmlFor={`account-${name}`} className="block text-zinc-300">{label}</label>
          <input id={`account-${name}`} name={name} type={type} autoComplete={autoComplete}
            value={values[name]} maxLength={maxLength} required readOnly={pending}
            aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : hint ? `${name}-hint` : undefined}
            onChange={(event) => { setValues({ ...values, [name]: event.target.value }); setErrors({ ...errors, [name]: undefined }); }}
            className="mt-2 w-full min-w-0 scroll-mt-28 rounded bg-zinc-700 p-3 text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-400" />
          {errors[name] ? <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-red-200">{errors[name]}</p>
            : hint && <p id={`${name}-hint`} className="mt-1 text-sm text-zinc-300">{hint}</p>}
        </div>
      ))}
      <button type="submit" disabled={pending} className="min-h-11 w-full rounded bg-blue-400 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 disabled:cursor-wait disabled:opacity-60">
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
