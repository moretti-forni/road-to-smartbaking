import { useState, type FormEvent } from 'react';
import type { ListingRequest, Save, Shop, StaffApi } from '../../services/studio';
import styles from '../../routes/admin.module.css';
import { CategoryField, Field, statuses, values } from './fields';
import { ShopEditor, type Review } from './shop-editor';

export function RequestEditor({
  request,
  api,
  save,
  busy,
  onMoved,
}: {
  request: ListingRequest;
  api: StaffApi;
  save: Save;
  busy: boolean;
  onMoved: (shop: Shop) => void;
}) {
  const [prepared, setPrepared] = useState(false);
  const [review, setReview] = useState<Review>();
  const details = review?.details ?? request;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.status === 'approved') return;
    const { text, optional } = values(event.currentTarget);
    const edits: Review = {
      status: text('status') as Review['status'],
      note: optional('note'),
      details: {
        businessName: text('businessName'),
        category: text('category') as ListingRequest['category'],
        address: text('address'),
        city: text('city'),
        country: text('country'),
        oven: text('oven'),
        website: optional('website'),
        contactName: text('contactName'),
        email: text('email'),
        notes: optional('notes'),
      },
    };
    setReview(edits);
    if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'convert') {
      setPrepared(true);
      return;
    }
    void save(async () => {
      await api.write('patch', `requests/${request.id}`, edits);
    }, 'Request saved.');
  }

  if (prepared && review) {
    return (
      <ShopEditor
        request={{ id: request.id, review }}
        api={api}
        save={save}
        busy={busy}
        onSaved={onMoved}
        onBack={() => setPrepared(false)}
      />
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <h2>Listing request</h2>
        <span className={styles.badge}>{statuses[request.status]}</span>
      </div>
      <p className={styles.secondary}>
        Received {new Date(request.createdAt).toLocaleString()} · {request.id}
      </p>
      {request.status === 'approved' && (
        <p className={styles.notice}>Linked to shop {request.shopId}.</p>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy || request.status === 'approved'}>
          <legend>Business details</legend>
          <div className={styles.fields}>
            <Field
              name="businessName"
              label="Business name"
              value={details.businessName}
              required
            />
            <CategoryField value={details.category} />
            <Field name="address" label="Street address" value={details.address} required />
            <Field name="city" label="City" value={details.city} required />
            <Field name="country" label="Country" value={details.country} required />
            <Field name="oven" label="Moretti oven" value={details.oven} required />
            <Field name="website" label="Website" value={details.website} type="url" />
          </div>
        </fieldset>
        <fieldset disabled={busy || request.status === 'approved'}>
          <legend>Private contact and review</legend>
          <div className={styles.fields}>
            <Field name="contactName" label="Contact name" value={details.contactName} required />
            <Field name="email" label="Contact email" value={details.email} type="email" required />
          </div>
          <Field name="notes" label="Submission notes" value={details.notes} type="textarea" />
          <Field
            name="note"
            label="Review note"
            value={review ? review.note : request.reviewNote}
            type="textarea"
          />
          <Field name="status" label="Status">
            <select name="status" defaultValue={review?.status ?? request.status}>
              {Object.entries(statuses)
                .filter(([status]) => status !== 'approved' || request.status === 'approved')
                .map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
            </select>
          </Field>
          {request.status !== 'approved' && (
            <div className={styles.actions}>
              <button type="submit">Save request</button>
              <button className={styles.primary} type="submit" value="convert">
                Prepare shop
              </button>
            </div>
          )}
        </fieldset>
      </form>
    </section>
  );
}
