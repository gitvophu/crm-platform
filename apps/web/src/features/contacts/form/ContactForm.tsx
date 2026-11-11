import {
  type ContactDto,
  type ContactTagDto,
  COUNTRY_CODES,
  COUNTRY_DEFAULT,
  createContactInput,
  HTTP_STATUS,
} from '@crm/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Building2, Lock, User } from 'lucide-react';
import { type FocusEvent, Fragment, type ReactNode, useState } from 'react';
import {
  type RegisterOptions,
  useForm,
  type UseFormRegisterReturn,
  useWatch,
} from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, describeError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { userQueries } from '@/features/users';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { contactQueries, DUPLICATES_SHOWN } from '@/features/contacts/contacts-api';
import { type CompanyChoice, CompanyCombobox } from './CompanyCombobox';
import { TagCombobox } from './TagCombobox';

type FormInput = z.input<typeof createContactInput>;
export type ContactFormValues = z.output<typeof createContactInput>;
type FieldName = keyof FormInput;
/** Fields typed in an `<input>`. */
type TextField = 'name' | 'email' | 'phone' | 'website' | 'jobTitle' | 'street' | 'city' | 'taxId';

/** Countries by English name, Vietnam first (most of Nova's clients). */
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const COUNTRIES = COUNTRY_CODES.map((code) => ({ code, name: regionNames.of(code) ?? code })).sort(
  (a, b) =>
    a.code === COUNTRY_DEFAULT ? -1 : b.code === COUNTRY_DEFAULT ? 1 : a.name.localeCompare(b.name),
);

/** Empty select → null, the "no value" of the shared schema. */
const emptyToNull = (value: string) => value || null;

/** Lowercase email worth checking for duplicates, or none. */
const checkable = (email: string | null | undefined) => {
  const value = email?.trim().toLowerCase() ?? '';
  return value.includes('@') ? value : '';
};

interface ContactFormProps {
  /** The contact to edit; none to create one. */
  contact?: ContactDto;
  /** New person from a company page ("Add person", `?companyId=`). */
  initialCompany?: CompanyChoice;
  /** Sends the values; resolves with the saved contact, rejects with the API error. */
  onSubmit: (values: ContactFormValues) => Promise<ContactDto>;
  onSaved: (contact: ContactDto) => void;
  onCancel: () => void;
}

function Field({
  id,
  label,
  required = false,
  locked = false,
  error,
  hint,
  warning,
  children,
}: {
  id: string;
  label: string;
  /** Marks the label; every other field is optional. */
  required?: boolean;
  /** Read-only: the value comes from the company (slice 1.4, Q6). */
  locked?: boolean;
  error?: string;
  hint?: ReactNode;
  /** Shown in amber; does not block saving (duplicate email). */
  warning?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden className="text-destructive">
            *
          </span>
        )}
        {locked && <Lock className="size-3 text-muted-foreground" aria-label="From the company" />}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-note`} className="text-xs text-destructive">
          {error}
        </p>
      ) : warning ? (
        <p
          id={`${id}-note`}
          role="status"
          className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1.5 text-xs text-foreground"
        >
          {warning}
        </p>
      ) : (
        hint && (
          <p id={`${id}-note`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function TypeCard({
  value,
  checked,
  disabled,
  icon,
  title,
  description,
  register,
}: {
  value: 'company' | 'person';
  checked: boolean;
  disabled: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  register: UseFormRegisterReturn<'type'>;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50',
        checked && 'border-primary bg-primary-soft',
        disabled && 'cursor-not-allowed opacity-55',
      )}
    >
      <input type="radio" value={value} disabled={disabled} className="sr-only" {...register} />
      <span className="text-muted-foreground">{icon}</span>
      <span className="grid">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <h3 className="mt-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
    {children}
  </h3>
);

export function ContactForm({
  contact,
  initialCompany,
  onSubmit,
  onSaved,
  onCancel,
}: ContactFormProps) {
  const queryClient = useQueryClient();
  const users = useQuery(userQueries.all());
  const industries = useQuery(contactQueries.industries());

  const [company, setCompany] = useState<CompanyChoice | null>(
    contact?.company ?? initialCompany ?? null,
  );
  const [tags, setTags] = useState<ContactTagDto[]>(contact?.tags ?? []);

  const form = useForm<FormInput, unknown, ContactFormValues>({
    resolver: zodResolver(createContactInput),
    defaultValues: {
      type: contact?.type ?? (initialCompany ? 'person' : 'company'),
      name: contact?.name ?? '',
      companyId: company?.id ?? null,
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
      website: contact?.website ?? '',
      jobTitle: contact?.jobTitle ?? '',
      street: contact?.street ?? '',
      city: contact?.city ?? '',
      countryCode: contact ? contact.countryCode : COUNTRY_DEFAULT,
      taxId: contact?.taxId ?? '',
      industryId: contact?.industry?.id ?? null,
      tagIds: tags.map((tag) => tag.id),
      salespersonId: contact?.salesperson?.id ?? null,
      notes: contact?.notes ?? '',
    },
  });
  const { errors, isDirty, isSubmitting } = form.formState;
  const unsaved = useUnsavedChanges(isDirty);
  const isPerson = useWatch({ control: form.control, name: 'type' }) === 'person';

  // The company of a person gives the address, tax ID and industry (slice 1.4, Q6).
  const companyDetail = useQuery({
    ...contactQueries.detail(company?.id ?? ''),
    enabled: isPerson && company !== null,
  });
  const synced = isPerson && company !== null ? companyDetail.data : undefined;
  const locked = isPerson && company !== null;

  // Duplicate email: checked when leaving the field, never blocks saving (Q3).
  const [checkedEmail, setCheckedEmail] = useState(checkable(contact?.email));
  const duplicates = useQuery({
    ...contactQueries.duplicates(checkedEmail),
    enabled: checkedEmail !== '',
  });
  const others = (duplicates.data?.items ?? [])
    .filter((other) => other.id !== contact?.id)
    .slice(0, DUPLICATES_SHOWN);
  // The total counts the contact being edited when its saved email is the one checked.
  const selfCounted = contact !== undefined && contact.email === checkedEmail ? 1 : 0;
  const moreOthers = (duplicates.data?.total ?? 0) - selfCounted - others.length;

  // A company that still has people cannot become a person (API: 409 company_has_people).
  const typeLocked = contact?.type === 'company' && (contact.peopleCount ?? 0) > 0;

  const pickCompany = (picked: ContactDto | null) => {
    if (picked) queryClient.setQueryData(contactQueries.detail(picked.id).queryKey, picked);
    setCompany(picked);
    form.setValue('companyId', picked?.id ?? null, { shouldDirty: true });
  };
  const pickTags = (picked: ContactTagDto[]) => {
    setTags(picked);
    form.setValue(
      'tagIds',
      picked.map((tag) => tag.id),
      { shouldDirty: true },
    );
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      // A company has no company; a person's company comes from the picker.
      const saved = await onSubmit({
        ...values,
        companyId: values.type === 'person' ? (company?.id ?? null) : null,
      });
      unsaved.allowLeave();
      onSaved(saved);
    } catch (error) {
      // 401: the session ended; the query client already sends the user to login.
      if (error instanceof ApiError && error.status === HTTP_STATUS.unauthorized) return;
      const fieldErrors = error instanceof ApiError ? Object.entries(error.fieldErrors) : [];
      if (fieldErrors.length > 0) {
        for (const [field, [message]] of fieldErrors) {
          form.setError(field as FieldName, { type: 'server', message });
        }
        form.setError('root.server', { type: 'server' });
        return;
      }
      const { message, requestId } = describeError(error);
      toast.error('Couldn’t save the contact', {
        description: requestId ? `${message} Request ID ${requestId}` : message,
      });
    }
  });

  const text = (name: TextField, options?: RegisterOptions<FormInput, TextField>) => ({
    id: name,
    ...form.register(name, options),
    disabled: isSubmitting,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': `${name}-note`,
  });
  const fromCompany = synced ? `From ${synced.name}` : undefined;
  const salespersonHint =
    locked && synced?.salesperson
      ? `Empty: uses the company’s salesperson (${synced.salesperson.name}).`
      : 'Optional.';

  return (
    <>
      <Card>
        <CardContent>
          <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-4">
            {errors.root?.server && (
              <Alert variant="destructive" className="border-destructive/25 bg-destructive-soft">
                <AlertDescription>
                  Couldn’t save the contact. Check the fields below.
                </AlertDescription>
              </Alert>
            )}
            <fieldset className="grid gap-1.5" aria-describedby="type-note">
              <legend className="sr-only">Type</legend>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <TypeCard
                  value="company"
                  checked={!isPerson}
                  disabled={isSubmitting}
                  icon={<Building2 className="size-4" />}
                  title="Company"
                  description="A business you work with"
                  register={form.register('type')}
                />
                <TypeCard
                  value="person"
                  checked={isPerson}
                  disabled={isSubmitting || typeLocked}
                  icon={<User className="size-4" />}
                  title="Person"
                  description="Someone at a company, or an individual"
                  register={form.register('type')}
                />
              </div>
              {(errors.type?.message ?? typeLocked) && (
                <p
                  id="type-note"
                  className={cn(
                    'text-xs',
                    errors.type ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {errors.type?.message ??
                    `${contact?.name} has ${contact?.peopleCount} ${contact?.peopleCount === 1 ? 'person' : 'people'}. Move them to another company before changing it to a person.`}
                </p>
              )}
            </fieldset>

            <Field
              id="name"
              label={isPerson ? 'Name' : 'Company name'}
              required
              error={errors.name?.message}
            >
              <Input autoComplete="off" autoFocus aria-required {...text('name')} />
            </Field>
            {isPerson && (
              <>
                <Field
                  id="companyId"
                  label="Company"
                  error={errors.companyId?.message}
                  hint={
                    company
                      ? 'Address, tax ID and industry come from the company.'
                      : 'Optional. Leave empty for an individual.'
                  }
                >
                  <CompanyCombobox
                    id="companyId"
                    value={company}
                    excludeId={contact?.id}
                    onChange={pickCompany}
                    disabled={isSubmitting}
                    invalid={Boolean(errors.companyId)}
                    describedBy="companyId-note"
                  />
                </Field>
                <Field id="jobTitle" label="Job title" error={errors.jobTitle?.message}>
                  <Input autoComplete="off" {...text('jobTitle')} />
                </Field>
              </>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="email"
                label="Email"
                error={errors.email?.message}
                warning={
                  others.length > 0 && (
                    <>
                      Already used by{' '}
                      {others.map((other, index) => (
                        <span key={other.id}>
                          {index > 0 && ', '}
                          <Link
                            to="/contacts/$id"
                            params={{ id: other.id }}
                            className="text-primary hover:underline"
                          >
                            {other.name}
                          </Link>
                          {other.company && ` (${other.company.name})`}
                        </span>
                      ))}
                      {moreOthers > 0 && ` and ${moreOthers} more`}. You can still save.
                    </>
                  )
                }
              >
                <Input
                  type="email"
                  autoComplete="off"
                  {...text('email', {
                    onBlur: (event: FocusEvent<HTMLInputElement>) =>
                      setCheckedEmail(checkable(event.target.value)),
                  })}
                />
              </Field>
              <Field id="phone" label="Phone" error={errors.phone?.message}>
                <Input type="tel" autoComplete="off" {...text('phone')} />
              </Field>
            </div>
            <Field id="website" label="Website" error={errors.website?.message}>
              <Input autoComplete="off" placeholder="example.com" {...text('website')} />
            </Field>

            <SectionLabel>Address</SectionLabel>
            {synced ? (
              // Read-only copies of the company's values; the API takes them from the company.
              // Keyed apart from the editable fields: React remounts the inputs instead of
              // turning registered (uncontrolled) inputs into controlled ones.
              <Fragment key="synced">
                <Field id="street" label="Street" locked hint={fromCompany}>
                  <Input id="street" readOnly value={synced.street ?? ''} className="bg-muted" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="city" label="City" locked>
                    <Input id="city" readOnly value={synced.city ?? ''} className="bg-muted" />
                  </Field>
                  <Field id="countryCode" label="Country" locked>
                    <Input
                      id="countryCode"
                      readOnly
                      value={synced.countryCode ? regionNames.of(synced.countryCode) : ''}
                      className="bg-muted"
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="taxId" label="Tax ID" locked hint={fromCompany}>
                    <Input id="taxId" readOnly value={synced.taxId ?? ''} className="bg-muted" />
                  </Field>
                  <Field id="industryId" label="Industry" locked>
                    <Input
                      id="industryId"
                      readOnly
                      value={synced.industry?.name ?? ''}
                      className="bg-muted"
                    />
                  </Field>
                </div>
              </Fragment>
            ) : (
              <Fragment key="editable">
                <Field id="street" label="Street" error={errors.street?.message}>
                  <Input autoComplete="off" {...text('street')} disabled={isSubmitting || locked} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="city" label="City" error={errors.city?.message}>
                    <Input autoComplete="off" {...text('city')} disabled={isSubmitting || locked} />
                  </Field>
                  <Field id="countryCode" label="Country" error={errors.countryCode?.message}>
                    <NativeSelect
                      id="countryCode"
                      className="w-full"
                      disabled={isSubmitting || locked}
                      {...form.register('countryCode', { setValueAs: emptyToNull })}
                    >
                      <NativeSelectOption value="">—</NativeSelectOption>
                      {COUNTRIES.map((country) => (
                        <NativeSelectOption key={country.code} value={country.code}>
                          {country.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="taxId"
                    label="Tax ID"
                    error={errors.taxId?.message}
                    hint="MST. Optional."
                  >
                    <Input
                      autoComplete="off"
                      {...text('taxId')}
                      disabled={isSubmitting || locked}
                    />
                  </Field>
                  <Field id="industryId" label="Industry" error={errors.industryId?.message}>
                    <NativeSelect
                      id="industryId"
                      className="w-full"
                      disabled={isSubmitting || locked || !industries.data}
                      {...form.register('industryId', { setValueAs: emptyToNull })}
                    >
                      <NativeSelectOption value="">—</NativeSelectOption>
                      {industries.data?.map((industry) => (
                        <NativeSelectOption key={industry.id} value={industry.id}>
                          {industry.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
              </Fragment>
            )}

            <SectionLabel>Sales</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="tagIds" label="Tags" error={errors.tagIds?.message}>
                <TagCombobox
                  id="tagIds"
                  value={tags}
                  onChange={pickTags}
                  disabled={isSubmitting}
                  invalid={Boolean(errors.tagIds)}
                  describedBy="tagIds-note"
                />
              </Field>
              <Field
                id="salespersonId"
                label="Salesperson"
                error={
                  errors.salespersonId?.message ??
                  (users.isError ? 'Couldn’t load the users.' : undefined)
                }
                hint={salespersonHint}
              >
                <NativeSelect
                  id="salespersonId"
                  className="w-full"
                  disabled={isSubmitting || !users.data}
                  aria-invalid={errors.salespersonId ? true : undefined}
                  {...form.register('salespersonId', { setValueAs: emptyToNull })}
                >
                  <NativeSelectOption value="">—</NativeSelectOption>
                  {/* A salesperson who is gone stays selectable, so the select shows the value. */}
                  {contact?.salesperson &&
                    !users.data?.some((user) => user.id === contact.salesperson?.id) && (
                      <NativeSelectOption value={contact.salesperson.id}>
                        {contact.salesperson.name}
                      </NativeSelectOption>
                    )}
                  {users.data?.map((user) => (
                    <NativeSelectOption key={user.id} value={user.id}>
                      {user.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field id="notes" label="Notes" error={errors.notes?.message}>
              <Textarea
                id="notes"
                rows={4}
                disabled={isSubmitting}
                aria-invalid={errors.notes ? true : undefined}
                {...form.register('notes')}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : contact ? 'Save changes' : 'Create contact'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {unsaved.dialog}
    </>
  );
}
