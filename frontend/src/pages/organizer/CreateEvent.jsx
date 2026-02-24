import { useState } from "react";
import api, { getApiErrorMessage } from "../../services/api";

const initialForm = {
  eventType: "Normal",
  name: "",
  description: "",
  eligibility: "ALL",
  registrationDeadline: "",
  eventStartDate: "",
  eventEndDate: "",
  registrationLimit: 50,
  registrationFee: 0,
  eventTags: "",
  price: 0,
  stockQuantity: 0,
  purchaseLimit: 1,
};

function CreateEvent() {
  const [form, setForm] = useState(initialForm);
  const [customFields, setCustomFields] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addCustomField = () => {
    setCustomFields((prev) => [
      ...prev,
      { label: "", fieldType: "text", required: false, options: [], order: prev.length },
    ]);
  };

  const updateCustomField = (index, key, value) => {
    setCustomFields((prev) => {
      const updated = [...prev];
      if (key === "options") {
        updated[index][key] = value.split(",").map((v) => v.trim()).filter(Boolean);
      } else {
        updated[index][key] = value;
      }
      return updated;
    });
  };

  const removeCustomField = (index) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = {
        ...form,
        eventTags: form.eventTags.split(",").map((t) => t.trim()).filter(Boolean),
        registrationLimit: Number(form.registrationLimit),
      };

      if (form.eventType === "Normal") {
        payload.registrationFee = Number(form.registrationFee);
        // Map customFields to ensure order and correct shape
        payload.customFormFields = customFields.map((f, i) => ({ ...f, order: i }));
      } else {
        payload.price = Number(form.price);
        payload.stockQuantity = Number(form.stockQuantity);
        payload.purchaseLimit = Number(form.purchaseLimit);
        payload.itemDetails = { sizes: [], colors: [], variants: [] };
      }

      const response = await api.post("/events/create", payload);
      setMessage(`Created draft event: ${response.data?.data?.name}`);
      setForm(initialForm);
      setCustomFields([]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create event"));
    }
  };

  return (
    <div className="page">
      <h2>Create Event (Draft)</h2>
      {message && <p>{message}</p>}
      {error && <p>{error}</p>}

      <form className="card" onSubmit={onSubmit}>
        <label>Event Type</label>
        <select className="input" name="eventType" value={form.eventType} onChange={onChange}>
          <option value="Normal">Normal</option>
          <option value="Merchandise">Merchandise</option>
        </select>

        <label>Event Name</label>
        <input className="input" name="name" value={form.name} onChange={onChange} required />

        <label>Description</label>
        <textarea className="input" name="description" value={form.description} onChange={onChange} required />

        <label>Eligibility</label>
        <select className="input" name="eligibility" value={form.eligibility} onChange={onChange}>
          <option value="ALL">All</option>
          <option value="IIIT">IIIT</option>
          <option value="NON_IIIT">Non-IIIT</option>
        </select>

        <label>Registration Deadline</label>
        <input className="input" name="registrationDeadline" type="datetime-local" value={form.registrationDeadline} onChange={onChange} required />

        <label>Event Start (Date & Time)</label>
        <input className="input" name="eventStartDate" type="datetime-local" value={form.eventStartDate} onChange={onChange} required />

        <label>Event End (Date & Time)</label>
        <input className="input" name="eventEndDate" type="datetime-local" value={form.eventEndDate} onChange={onChange} required />

        <label>Registration / Purchase Limit</label>
        <input className="input" name="registrationLimit" type="number" min="1" value={form.registrationLimit} onChange={onChange} required />

        <label>Event Tags (comma separated)</label>
        <input className="input" name="eventTags" value={form.eventTags} onChange={onChange} />

        {form.eventType === "Normal" ? (
          <>
            <label>Registration Fee</label>
            <input className="input" name="registrationFee" type="number" min="0" value={form.registrationFee} onChange={onChange} />

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <div style={{ flex: 1 }}>
                <label>Min Team Size</label>
                <input className="input" name="minTeamSize" type="number" min="1" value={form.minTeamSize || 1} onChange={onChange} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Max Team Size ( &gt;1 for Team Events )</label>
                <input className="input" name="maxTeamSize" type="number" min="1" value={form.maxTeamSize || 1} onChange={onChange} required />
              </div>
            </div>

            <div style={{ marginTop: "15px", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
              <h4>Custom Form Builder</h4>
              {customFields.map((field, index) => (
                <div key={index} style={{ border: "1px solid #eee", padding: "10px", marginBottom: "10px", borderRadius: "5px" }}>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "5px", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <label>Field Name (e.g., T-Shirt Size)</label>
                      <input className="input" value={field.label} onChange={(e) => updateCustomField(index, "label", e.target.value)} style={{ width: "100%", marginTop: "5px" }} required />
                    </div>
                    <div>
                      <label>Type</label>
                      <select className="input" value={field.fieldType} onChange={(e) => updateCustomField(index, "fieldType", e.target.value)} style={{ display: "block", marginTop: "5px" }}>
                        <option value="text">Text</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="file">File Upload</option>
                      </select>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", paddingBottom: "10px" }}>
                      <input type="checkbox" checked={field.required} onChange={(e) => updateCustomField(index, "required", e.target.checked)} /> Req
                    </label>
                    <button type="button" className="button button-danger" onClick={() => removeCustomField(index)} style={{ marginBottom: "5px" }}>X</button>
                  </div>
                  {(field.fieldType === "dropdown" || field.fieldType === "checkbox") && (
                    <div style={{ marginTop: "10px" }}>
                      <label>Options (comma separated)</label>
                      <input className="input small" value={field.options.join(", ")} onChange={(e) => updateCustomField(index, "options", e.target.value)} style={{ width: "100%", marginTop: "5px" }} />
                    </div>
                  )}
                </div>
              ))}
              <button type="button" className="button button-secondary" onClick={addCustomField}>+ Add Field</button>
            </div>
          </>
        ) : (
          <>
            <label>Price</label>
            <input className="input" name="price" type="number" min="0" value={form.price} onChange={onChange} required />

            <label>Stock Quantity</label>
            <input className="input" name="stockQuantity" type="number" min="0" value={form.stockQuantity} onChange={onChange} required />

            <label>Max Purchase Limit (per user)</label>
            <input className="input" name="purchaseLimit" type="number" min="1" value={form.purchaseLimit} onChange={onChange} />
          </>
        )}

        <button className="button" type="submit" style={{ marginTop: "20px" }}>Create Draft</button>
      </form>
    </div>
  );
}

export default CreateEvent;
