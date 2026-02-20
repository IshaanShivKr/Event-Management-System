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
        <select className="input" name="eventType" value={form.eventType} onChange={onChange}>
          <option value="Normal">Normal</option>
          <option value="Merchandise">Merchandise</option>
        </select>
        <input className="input" name="name" placeholder="Event name" value={form.name} onChange={onChange} required />
        <textarea className="input" name="description" placeholder="Description" value={form.description} onChange={onChange} required />
        <select className="input" name="eligibility" value={form.eligibility} onChange={onChange}>
          <option value="ALL">All</option>
          <option value="IIIT">IIIT</option>
          <option value="NON_IIIT">Non-IIIT</option>
        </select>
        <label>Registration Deadline</label>
        <input className="input" name="registrationDeadline" type="datetime-local" value={form.registrationDeadline} onChange={onChange} required />
        <label>Start</label>
        <input className="input" name="eventStartDate" type="datetime-local" value={form.eventStartDate} onChange={onChange} required />
        <label>End</label>
        <input className="input" name="eventEndDate" type="datetime-local" value={form.eventEndDate} onChange={onChange} required />
        <input className="input" name="registrationLimit" type="number" min="1" value={form.registrationLimit} onChange={onChange} required />
        <input className="input" name="eventTags" placeholder="Tags (comma separated)" value={form.eventTags} onChange={onChange} />

        {form.eventType === "Normal" ? (
          <>
            <input className="input" name="registrationFee" type="number" min="0" value={form.registrationFee} onChange={onChange} placeholder="Registration Fee" />

            <div style={{ marginTop: "15px", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
              <h4>Custom Form Builder</h4>
              {customFields.map((field, index) => (
                <div key={index} style={{ border: "1px solid #eee", padding: "10px", marginBottom: "10px", borderRadius: "5px" }}>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "5px" }}>
                    <input className="input" placeholder="Field Label (e.g. T-Shirt Size)" value={field.label} onChange={(e) => updateCustomField(index, "label", e.target.value)} style={{ flex: 1 }} required />
                    <select className="input" value={field.fieldType} onChange={(e) => updateCustomField(index, "fieldType", e.target.value)}>
                      <option value="text">Text</option>
                      <option value="dropdown">Dropdown</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="file">File Upload</option>
                    </select>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <input type="checkbox" checked={field.required} onChange={(e) => updateCustomField(index, "required", e.target.checked)} /> Req
                    </label>
                    <button type="button" className="button button-danger" onClick={() => removeCustomField(index)}>X</button>
                  </div>
                  {(field.fieldType === "dropdown" || field.fieldType === "checkbox") && (
                    <input className="input small" placeholder="Options (comma separated)" value={field.options.join(", ")} onChange={(e) => updateCustomField(index, "options", e.target.value)} />
                  )}
                </div>
              ))}
              <button type="button" className="button button-secondary" onClick={addCustomField}>+ Add Field</button>
            </div>
          </>
        ) : (
          <>
            <input className="input" name="price" type="number" min="0" value={form.price} onChange={onChange} required placeholder="Price" />
            <input className="input" name="stockQuantity" type="number" min="0" value={form.stockQuantity} onChange={onChange} required placeholder="Stock Quantity" />
            <input className="input" name="purchaseLimit" type="number" min="1" value={form.purchaseLimit} onChange={onChange} placeholder="Max Purchase Limit" />
          </>
        )}

        <button className="button" type="submit" style={{ marginTop: "20px" }}>Create Draft</button>
      </form>
    </div>
  );
}

export default CreateEvent;
