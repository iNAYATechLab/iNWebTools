/**
 * Settings editor for one placed widget.
 *
 * Every control here is generated from the field schema the *server* ships in
 * /api/widgets/catalogue — there is no per-widget-type form code. That is the
 * point of the schema: the same declaration drives the validator and this
 * form, so a field can never exist in one and not the other, and adding a
 * widget type needs no changes in this file.
 *
 * `kind` maps to a control:
 *   text | url | image -> single-line input
 *   textarea | html    -> multi-line input
 *   number             -> number input, clamped to the declared min/max
 *   boolean            -> toggle
 *   select             -> dropdown of the declared options
 */

import { Field, Select, TextArea, TextInput, Toggle } from '../../components/form';
import type { WidgetDefinition, WidgetInstance, WidgetSettings } from '../../../../types/widgets';

export function WidgetSettingsForm({
  widget,
  definition,
  onChange,
}: {
  widget: WidgetInstance;
  definition: WidgetDefinition;
  onChange: (patch: Partial<WidgetInstance>) => void;
}) {
  const setSetting = (key: string, value: WidgetSettings[string]) =>
    onChange({ settings: { ...widget.settings, [key]: value } });

  return (
    <div className="space-y-1">
      {/*
        Title is common to every widget and lives on the instance rather than
        in settings, so it is rendered here rather than coming from the schema.
        An empty title is valid and means "render no heading".
      */}
      <Field
        label="Widget title"
        htmlFor={`${widget.id}-title`}
        hint="Leave empty to hide the heading entirely."
      >
        <TextInput
          id={`${widget.id}-title`}
          value={widget.title}
          onChange={(value) => onChange({ title: value })}
          maxLength={80}
          placeholder={definition.defaultTitle}
        />
      </Field>

      {definition.fields.map((field) => {
        const id = `${widget.id}-${field.key}`;
        const raw = widget.settings[field.key];

        switch (field.kind) {
          case 'boolean':
            return (
              <Toggle
                key={field.key}
                label={field.label}
                hint={field.help}
                checked={Boolean(raw)}
                onChange={(checked) => setSetting(field.key, checked)}
              />
            );

          case 'number':
            return (
              <Field key={field.key} label={field.label} htmlFor={id} hint={field.help}>
                <input
                  id={id}
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={Number(raw ?? field.default)}
                  onChange={(e) => {
                    // Clamp here as well as on the server so the admin sees the
                    // real stored value immediately rather than after a save.
                    const next = Number.parseInt(e.target.value, 10);
                    if (Number.isNaN(next)) return;
                    const min = field.min ?? 0;
                    const max = field.max ?? 1000;
                    setSetting(field.key, Math.min(max, Math.max(min, next)));
                  }}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 focus:border-brand-400 focus:outline-none"
                />
              </Field>
            );

          case 'select':
            return (
              <Field key={field.key} label={field.label} htmlFor={id} hint={field.help}>
                <Select
                  id={id}
                  value={String(raw ?? field.default)}
                  onChange={(value) => setSetting(field.key, value)}
                  options={field.options ?? []}
                />
              </Field>
            );

          case 'html':
          case 'textarea':
            return (
              <Field key={field.key} label={field.label} htmlFor={id} hint={field.help}>
                <TextArea
                  id={id}
                  rows={field.kind === 'html' ? 6 : 3}
                  value={String(raw ?? '')}
                  onChange={(value) => setSetting(field.key, value)}
                  maxLength={field.max ?? 1000}
                />
                {field.kind === 'html' && (
                  <p className="mt-1 text-right text-[10px] tabular-nums text-slate-600">
                    {String(raw ?? '').length} / {field.max ?? 5000}
                  </p>
                )}
              </Field>
            );

          default:
            return (
              <Field key={field.key} label={field.label} htmlFor={id} hint={field.help}>
                <TextInput
                  id={id}
                  type={field.kind === 'url' ? 'url' : 'text'}
                  value={String(raw ?? '')}
                  onChange={(value) => setSetting(field.key, value)}
                  maxLength={field.max ?? 200}
                />
              </Field>
            );
        }
      })}
    </div>
  );
}
