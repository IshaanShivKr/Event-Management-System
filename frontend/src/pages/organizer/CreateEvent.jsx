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
  const [customFormJson, setCustomFormJson] = useState("[]");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
        payload.customFormFields = JSON.parse(customFormJson || "[]");
      } else {
        payload.price = Number(form.price);
        payload.stockQuantity = Number(form.stockQuantity);
        payload.purchaseLimit = Number(form.purchaseLimit);
        payload.itemDetails = { sizes: [], colors: [], variants: [] };
      }

      const response = await api.post("/events/create", payload);
      setMessage(`Created draft event: ${response.data?.data?.name}`);
      setForm(initialForm);
      setCustomFormJson("[]");
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
            <input className="input" name="registrationFee" type="number" min="0" value={form.registrationFee} onChange={onChange} />
            <label>Custom Form Fields (JSON)</label>
            <textarea className="input" rows="6" value={customFormJson} onChange={(e) => setCustomFormJson(e.target.value)} />
          </>
        ) : (
          <>
            <input className="input" name="price" type="number" min="0" value={form.price} onChange={onChange} required />
            <input className="input" name="stockQuantity" type="number" min="0" value={form.stockQuantity} onChange={onChange} required />
            <input className="input" name="purchaseLimit" type="number" min="1" value={form.purchaseLimit} onChange={onChange} />
          </>
        )}

        <button className="button" type="submit">Create Draft</button>
      </form>
    </div>
  );
}

export default CreateEvent;
