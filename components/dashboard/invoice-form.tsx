 "use client"

import React, { useMemo, useRef, useState } from "react"

type InvoiceClient = {
  id: string
  name: string
  gst_number?: string | null
  address?: string | null
  state_code?: string | null
  city?: string | null
  pincode?: string | null
  phone?: string | null
  email?: string | null
}

type LegacyInitialInvoice = {
  id?: string
  client_id?: string
  invoice_number?: string
  invoice_date?: string | Date
  due_date?: string | Date
  status?: string
  place_of_supply?: string | null
  reverse_charge?: string | null
  transport_mode?: string | null
  dispatch_name?: string | null
  dispatch_pincode?: string | null
  party_name?: string | null
  party_gstin?: string | null
  recipient_legal_name?: string | null
  recipient_address?: string | null
  recipient_state_code?: string | null
  recipient_place?: string | null
  recipient_pincode?: string | null
  shipping_name?: string | null
  shipping_address?: string | null
  shipping_phone?: string | null
  shipping_email?: string | null
  shipping_to_gstin?: string | null
  shipping_to_state?: string | null
  shipping_to_state_code?: string | null
  shipping_to_pincode?: string | null
  dispatch_from_name?: string | null
  dispatch_from_place?: string | null
  dispatch_from_pincode?: string | null
  terms?: string | null
  terms_conditions?: string | null
  client_name?: string
  client_address?: string
  client_gst_number?: string
  client_phone?: string
  client_email?: string
  items?: Array<{
    description: string
    hsn_code?: string | null
    quantity: number
    rate: number
    discount_percent?: number | null
    tax_percent: number
    amount?: number | null
  }>
}

type InvoiceFormDefaults = {
  place_of_supply?: string | null
  reverse_charge?: string | null
  transport_mode?: string | null
  terms?: string | null
}

interface InvoiceFormProps {
  clients: InvoiceClient[]
  action: (formData: FormData) => void
  initial?: LegacyInitialInvoice | null
  defaults?: InvoiceFormDefaults | null
}

type InvoiceItem = {
  id: number
  itemName: string
  hsnCode: string
  quantity: number
  price: number
  discount: number
  taxRate: number
  amount: number
}

type InvoiceDetails = {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  placeOfSupply: string
  reverseCharge: string
  status: string
}

type PartyDetails = {
  legalName: string
  gstin: string
  address: string
  place: string
  stateCode: string
  pincode: string
  phone: string
  email: string
}

type TransportDetails = {
  transportMode: string
  dispatchName: string
  dispatchPlace: string
  dispatchPincode: string
}

function toDateInput(value?: string | Date | null) {
  if (!value) return ""
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().split("T")[0]
  return value.slice(0, 10)
}

function normalizeStatus(value?: string | null) {
  if (!value) return "Pending"
  const v = value.toUpperCase()
  if (v === "PAID") return "Paid"
  if (v === "OVERDUE") return "Overdue"
  if (v === "DRAFT") return "Draft"
  if (v === "CANCELLED") return "Cancelled"
  return "Pending"
}

function defaultTerms(defaults?: InvoiceFormDefaults | null) {
  if (defaults?.terms?.trim()) return defaults.terms
  return "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. may be charged on delayed payment.\n3. Subject to local jurisdiction only."
}

function getClientStateCode(client?: InvoiceClient) {
  const state = client?.state_code?.trim() || ""
  return state.toUpperCase()
}

function getClientPlace(client?: InvoiceClient) {
  return (client?.city || "").trim()
}

function getClientPincode(client?: InvoiceClient) {
  return (client?.pincode || "").trim()
}

function initialDetails(initial?: LegacyInitialInvoice | null, defaults?: InvoiceFormDefaults | null): InvoiceDetails {
  return {
    invoiceNumber: initial?.invoice_number || "",
    invoiceDate: toDateInput(initial?.invoice_date) || new Date().toISOString().split("T")[0],
    dueDate: toDateInput(initial?.due_date),
    placeOfSupply: String(initial?.place_of_supply || defaults?.place_of_supply || ""),
    reverseCharge: (initial?.reverse_charge || defaults?.reverse_charge || "No").toUpperCase() === "YES" ? "Yes" : "No",
    status: normalizeStatus(initial?.status),
  }
}

function initialBiller(initial?: LegacyInitialInvoice | null): PartyDetails {
  return {
    legalName: String(initial?.recipient_legal_name || initial?.party_name || initial?.client_name || ""),
    gstin: String(initial?.party_gstin || initial?.client_gst_number || ""),
    address: String(initial?.recipient_address || initial?.client_address || ""),
    place: String(initial?.recipient_place || ""),
    stateCode: String(initial?.recipient_state_code || ""),
    pincode: String(initial?.recipient_pincode || ""),
    phone: String(initial?.client_phone || ""),
    email: String(initial?.client_email || ""),
  }
}

function initialShipping(initial?: LegacyInitialInvoice | null, biller?: PartyDetails): PartyDetails {
  const hasShipping = Boolean(
    initial?.shipping_name ||
      initial?.shipping_address ||
      initial?.shipping_phone ||
      initial?.shipping_email ||
      initial?.shipping_to_gstin ||
      initial?.shipping_to_state ||
      initial?.shipping_to_state_code ||
      initial?.shipping_to_pincode,
  )

  if (!hasShipping && biller) {
    return { ...biller }
  }

  return {
    legalName: String(initial?.shipping_name || biller?.legalName || ""),
    gstin: String(initial?.shipping_to_gstin || biller?.gstin || ""),
    address: String(initial?.shipping_address || biller?.address || ""),
    place: String(initial?.shipping_to_state || biller?.place || ""),
    stateCode: String(initial?.shipping_to_state_code || biller?.stateCode || ""),
    pincode: String(initial?.shipping_to_pincode || initial?.dispatch_pincode || biller?.pincode || ""),
    phone: String(initial?.shipping_phone || biller?.phone || ""),
    email: String(initial?.shipping_email || biller?.email || ""),
  }
}

function initialTransport(initial?: LegacyInitialInvoice | null, defaults?: InvoiceFormDefaults | null): TransportDetails {
  return {
    transportMode: String(initial?.transport_mode || defaults?.transport_mode || ""),
    dispatchName: String(initial?.dispatch_from_name || initial?.dispatch_name || ""),
    dispatchPlace: String(initial?.dispatch_from_place || ""),
    dispatchPincode: String(initial?.dispatch_from_pincode || initial?.dispatch_pincode || ""),
  }
}

function initialItems(initial?: LegacyInitialInvoice | null): InvoiceItem[] {
  if (initial?.items?.length) {
    return initial.items.map((item, index) => {
      const base = (Number(item.quantity) || 0) * (Number(item.rate) || 0)
      const discount = Number(item.discount_percent ?? 0)
      const taxRate = Number(item.tax_percent || 0)
      const discountAmount = (base * discount) / 100
      const taxable = base - discountAmount
      const tax = (taxable * taxRate) / 100
      return {
        id: index + 1,
        itemName: item.description || "",
        hsnCode: item.hsn_code || "",
        quantity: Number(item.quantity) || 1,
        price: Number(item.rate) || 0,
        discount,
        taxRate,
        amount: Number(item.amount ?? taxable + tax),
      }
    })
  }

  return [
    {
      id: 1,
      itemName: "",
      hsnCode: "",
      quantity: 1,
      price: 0,
      discount: 0,
      taxRate: 18,
      amount: 0,
    },
  ]
}

function toBackendStatus(value: string) {
  if (value === "Paid") return "PAID"
  if (value === "Overdue") return "OVERDUE"
  if (value === "Draft") return "DRAFT"
  if (value === "Cancelled") return "CANCELLED"
  return "SENT"
}

function normalizeClientIntoParty(client: InvoiceClient): PartyDetails {
  return {
    legalName: client.name || "",
    gstin: client.gst_number || "",
    address: client.address || "",
    place: getClientPlace(client),
    stateCode: getClientStateCode(client),
    pincode: getClientPincode(client),
    phone: client.phone || "",
    email: client.email || "",
  }
}

export function InvoiceForm({ clients, action, initial, defaults }: InvoiceFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [clientId, setClientId] = useState(initial?.client_id || "")
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>(initialDetails(initial, defaults))
  const [billerDetails, setBillerDetails] = useState<PartyDetails>(initialBiller(initial))
  const [shippingDetails, setShippingDetails] = useState<PartyDetails>(initialShipping(initial, initialBiller(initial)))
  const [shippingSameAsBiller, setShippingSameAsBiller] = useState(
    !initial?.shipping_name && !initial?.shipping_address && !initial?.shipping_phone,
  )
  const [transportDetails, setTransportDetails] = useState<TransportDetails>(initialTransport(initial, defaults))
  const [termsConditions, setTermsConditions] = useState(
    initial?.terms_conditions || initial?.terms || defaultTerms(defaults),
  )
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>(initialItems(initial))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addItem = () => {
    setInvoiceItems((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        itemName: "",
        hsnCode: "",
        quantity: 1,
        price: 0,
        discount: 0,
        taxRate: 18,
        amount: 0,
      },
    ])
  }

  const deleteItem = (id: number) => {
    setInvoiceItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev))
  }

  const updateItem = (id: number, field: keyof InvoiceItem, value: string | number) => {
    setInvoiceItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated: InvoiceItem = { ...item, [field]: value } as InvoiceItem
        const qty = Number(updated.quantity) || 0
        const price = Number(updated.price) || 0
        const discount = Number(updated.discount) || 0
        const taxRate = Number(updated.taxRate) || 0
        const base = qty * price
        const discountAmount = (base * discount) / 100
        const taxable = base - discountAmount
        const tax = (taxable * taxRate) / 100
        updated.amount = taxable + tax
        return updated
      }),
    )
  }

  const totals = useMemo(() => {
    const subtotal = invoiceItems.reduce((sum, item) => {
      const base = item.price * item.quantity
      const discountAmount = (base * item.discount) / 100
      return sum + (base - discountAmount)
    }, 0)

    const discount = invoiceItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity * item.discount) / 100
    }, 0)

    const totalTax = invoiceItems.reduce((sum, item) => {
      const base = item.price * item.quantity
      const discountAmount = (base * item.discount) / 100
      const taxable = base - discountAmount
      return sum + (taxable * item.taxRate) / 100
    }, 0)

    const cgst = totalTax / 2
    const sgst = totalTax / 2
    const igst = 0
    const total = invoiceItems.reduce((sum, item) => sum + (item.amount || 0), 0)

    return { subtotal, discount, cgst, sgst, igst, total, totalTax }
  }, [invoiceItems])

  const taxType = useMemo(() => {
    const supplier = billerDetails.stateCode.trim().toUpperCase()
    const place = invoiceDetails.placeOfSupply.trim().toUpperCase()
    if (supplier && place && supplier !== place) return "IGST"
    return "CGST_SGST"
  }, [billerDetails.stateCode, invoiceDetails.placeOfSupply])

  const detailsPayload = useMemo(() => {
    return {
      invoiceNumber: invoiceDetails.invoiceNumber,
      invoiceDate: invoiceDetails.invoiceDate,
      dueDate: invoiceDetails.dueDate,
      placeOfSupplyStateCode: invoiceDetails.placeOfSupply,
      reverseCharge: invoiceDetails.reverseCharge,
      party: billerDetails.legalName,
      partyGSTIN: billerDetails.gstin,
      recipientLegalName: billerDetails.legalName,
      recipientAddress: billerDetails.address,
      recipientStateCode: billerDetails.stateCode,
      recipientPlace: billerDetails.place,
      recipientPincode: billerDetails.pincode,
      shippingToGSTIN: shippingDetails.gstin,
      shippingToState: shippingDetails.place,
      shippingToStateCode: shippingDetails.stateCode,
      shippingToPincode: shippingDetails.pincode,
      dispatchFromName: transportDetails.dispatchName,
      dispatchFromPlace: transportDetails.dispatchPlace,
      dispatchFromPincode: transportDetails.dispatchPincode,
      transportMode: transportDetails.transportMode,
      status: invoiceDetails.status,
    }
  }, [invoiceDetails, billerDetails, shippingDetails, transportDetails])

  const createInvoice = async () => {
    if (!clientId) {
      alert("Client is required.")
      return
    }

    if (!billerDetails.legalName) {
      alert("Biller legal name is required.")
      return
    }

    const validItems = invoiceItems.filter((i) => i.itemName.trim() !== "")
    if (validItems.length === 0) {
      alert("Add at least one item.")
      return
    }

    setIsSubmitting(true)
    try {
      formRef.current?.requestSubmit()
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
  }

  const sectionTitleStyle: React.CSSProperties = {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: 700,
  }

  const sectionWrapStyle: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    background: "#ffffff",
  }

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-lg border bg-white p-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="status" value={toBackendStatus(invoiceDetails.status)} />
      <input type="hidden" name="taxType" value={taxType} />
      <input type="hidden" name="invoiceDate" value={invoiceDetails.invoiceDate} />
      <input type="hidden" name="dueDate" value={invoiceDetails.dueDate || invoiceDetails.invoiceDate} />
      <input type="hidden" name="reverseCharge" value={invoiceDetails.reverseCharge} />
      <input type="hidden" name="placeOfSupply" value={invoiceDetails.placeOfSupply} />
      <input type="hidden" name="shippingName" value={shippingDetails.legalName} />
      <input type="hidden" name="shippingAddress" value={shippingDetails.address} />
      <input type="hidden" name="shippingPhone" value={shippingDetails.phone} />
      <input type="hidden" name="shippingEmail" value={shippingDetails.email} />
      <input type="hidden" name="dispatchName" value={transportDetails.dispatchName} />
      <input type="hidden" name="dispatchPincode" value={transportDetails.dispatchPincode} />
      <input type="hidden" name="notes" value={termsConditions} />
      <input type="hidden" name="terms" value={termsConditions} />
      <input type="hidden" name="detailsPayload" value={JSON.stringify(detailsPayload)} />
      <input type="hidden" name="brandingPayload" value="{}" />
      <input
        type="hidden"
        name="itemsPayload"
        value={JSON.stringify(
          invoiceItems.map((item) => ({
            itemName: item.itemName,
            hsnCode: item.hsnCode,
            quantity: Number(item.quantity) || 0,
            price: Number(item.price) || 0,
            discount: Number(item.discount) || 0,
            taxRate: Number(item.taxRate) || 0,
            amount: Number(item.amount) || 0,
          })),
        )}
      />

      <div style={sectionWrapStyle}>
        <div style={sectionTitleStyle}>Client</div>
        <select
          style={inputStyle}
          value={clientId}
          onChange={(e) => {
            const selectedId = e.target.value
            const selectedClient = clients.find((c) => c.id === selectedId)
            setClientId(selectedId)

            if (!selectedClient) return

            const normalized = normalizeClientIntoParty(selectedClient)
            setBillerDetails(normalized)
            if (shippingSameAsBiller) {
              setShippingDetails(normalized)
            }
            setInvoiceDetails((prev) => ({
              ...prev,
              placeOfSupply: prev.placeOfSupply || normalized.stateCode,
            }))
          }}
        >
          <option value="">Select client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div style={sectionWrapStyle}>
        <div style={sectionTitleStyle}>Invoice Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10 }}>
          <div>
            <label>Invoice Number</label>
            <input
              style={inputStyle}
              value={invoiceDetails.invoiceNumber}
              onChange={(e) => setInvoiceDetails({ ...invoiceDetails, invoiceNumber: e.target.value })}
              placeholder="INV-0001"
            />
          </div>
          <div>
            <label>Invoice Date</label>
            <input
              type="date"
              style={inputStyle}
              value={invoiceDetails.invoiceDate}
              onChange={(e) => setInvoiceDetails({ ...invoiceDetails, invoiceDate: e.target.value })}
            />
          </div>
          <div>
            <label>Due Date</label>
            <input
              type="date"
              style={inputStyle}
              value={invoiceDetails.dueDate}
              onChange={(e) => setInvoiceDetails({ ...invoiceDetails, dueDate: e.target.value })}
            />
          </div>
          <div>
            <label>Place Of Supply</label>
            <input
              style={inputStyle}
              value={invoiceDetails.placeOfSupply}
              onChange={(e) => setInvoiceDetails({ ...invoiceDetails, placeOfSupply: e.target.value })}
              placeholder="State code"
            />
          </div>
          <div>
            <label>Reverse Charge</label>
            <select
              style={inputStyle}
              value={invoiceDetails.reverseCharge}
              onChange={(e) => setInvoiceDetails({ ...invoiceDetails, reverseCharge: e.target.value })}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div>
            <label>Status</label>
            <select
              style={inputStyle}
              value={invoiceDetails.status}
              onChange={(e) => setInvoiceDetails({ ...invoiceDetails, status: e.target.value })}
            >
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Draft">Draft</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div style={sectionWrapStyle}>
        <div style={sectionTitleStyle}>Biller Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
          <div>
            <label>Legal Name</label>
            <input
              style={inputStyle}
              value={billerDetails.legalName}
              onChange={(e) => {
                const next = { ...billerDetails, legalName: e.target.value }
                setBillerDetails(next)
                if (shippingSameAsBiller) setShippingDetails(next)
              }}
            />
          </div>
          <div>
            <label>GSTIN</label>
            <input
              style={inputStyle}
              value={billerDetails.gstin}
              onChange={(e) => {
                const next = { ...billerDetails, gstin: e.target.value }
                setBillerDetails(next)
                if (shippingSameAsBiller) setShippingDetails(next)
              }}
            />
          </div>
          <div>
            <label>State Code</label>
            <input
              style={inputStyle}
              value={billerDetails.stateCode}
              onChange={(e) => {
                const next = { ...billerDetails, stateCode: e.target.value }
                setBillerDetails(next)
                if (shippingSameAsBiller) setShippingDetails(next)
              }}
            />
          </div>
          <div>
            <label>Pincode</label>
            <input
              style={inputStyle}
              value={billerDetails.pincode}
              onChange={(e) => {
                const next = { ...billerDetails, pincode: e.target.value }
                setBillerDetails(next)
                if (shippingSameAsBiller) setShippingDetails(next)
              }}
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label>Address</label>
            <input
              style={inputStyle}
              value={billerDetails.address}
              onChange={(e) => {
                const next = { ...billerDetails, address: e.target.value }
                setBillerDetails(next)
                if (shippingSameAsBiller) setShippingDetails(next)
              }}
            />
          </div>
          <div>
            <label>Place</label>
            <input
              style={inputStyle}
              value={billerDetails.place}
              onChange={(e) => {
                const next = { ...billerDetails, place: e.target.value }
                setBillerDetails(next)
                if (shippingSameAsBiller) setShippingDetails(next)
              }}
            />
          </div>
          <div>
            <label>Phone</label>
            <input
              style={inputStyle}
              value={billerDetails.phone}
              onChange={(e) => {
                const next = { ...billerDetails, phone: e.target.value }
                setBillerDetails(next)
                if (shippingSameAsBiller) setShippingDetails(next)
              }}
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label>Email</label>
            <input
              type="email"
              style={inputStyle}
              value={billerDetails.email}
              onChange={(e) => {
                const next = { ...billerDetails, email: e.target.value }
                setBillerDetails(next)
                if (shippingSameAsBiller) setShippingDetails(next)
              }}
            />
          </div>
        </div>
      </div>

      <div style={sectionWrapStyle}>
        <div style={sectionTitleStyle}>Shipping Details</div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={shippingSameAsBiller}
            onChange={(e) => {
              const checked = e.target.checked
              setShippingSameAsBiller(checked)
              if (checked) {
                setShippingDetails({ ...billerDetails })
              }
            }}
          />
          Same as Biller Details
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
          <div>
            <label>Shipping Name</label>
            <input
              style={inputStyle}
              value={shippingDetails.legalName}
              onChange={(e) => setShippingDetails({ ...shippingDetails, legalName: e.target.value })}
              disabled={shippingSameAsBiller}
            />
          </div>
          <div>
            <label>Shipping GSTIN</label>
            <input
              style={inputStyle}
              value={shippingDetails.gstin}
              onChange={(e) => setShippingDetails({ ...shippingDetails, gstin: e.target.value })}
              disabled={shippingSameAsBiller}
            />
          </div>
          <div>
            <label>Shipping State</label>
            <input
              style={inputStyle}
              value={shippingDetails.stateCode}
              onChange={(e) => setShippingDetails({ ...shippingDetails, stateCode: e.target.value })}
              disabled={shippingSameAsBiller}
            />
          </div>
          <div>
            <label>Shipping Pincode</label>
            <input
              style={inputStyle}
              value={shippingDetails.pincode}
              onChange={(e) => setShippingDetails({ ...shippingDetails, pincode: e.target.value })}
              disabled={shippingSameAsBiller}
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label>Shipping Address</label>
            <input
              style={inputStyle}
              value={shippingDetails.address}
              onChange={(e) => setShippingDetails({ ...shippingDetails, address: e.target.value })}
              disabled={shippingSameAsBiller}
            />
          </div>
          <div>
            <label>Shipping Place</label>
            <input
              style={inputStyle}
              value={shippingDetails.place}
              onChange={(e) => setShippingDetails({ ...shippingDetails, place: e.target.value })}
              disabled={shippingSameAsBiller}
            />
          </div>
          <div>
            <label>Shipping Phone</label>
            <input
              style={inputStyle}
              value={shippingDetails.phone}
              onChange={(e) => setShippingDetails({ ...shippingDetails, phone: e.target.value })}
              disabled={shippingSameAsBiller}
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label>Shipping Email</label>
            <input
              type="email"
              style={inputStyle}
              value={shippingDetails.email}
              onChange={(e) => setShippingDetails({ ...shippingDetails, email: e.target.value })}
              disabled={shippingSameAsBiller}
            />
          </div>
        </div>
      </div>

      <div style={sectionWrapStyle}>
        <div style={sectionTitleStyle}>Transport Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
          <div>
            <label>Transport Mode</label>
            <select
              style={inputStyle}
              value={transportDetails.transportMode}
              onChange={(e) => setTransportDetails({ ...transportDetails, transportMode: e.target.value })}
            >
              <option value="">Select</option>
              <option value="road">Road</option>
              <option value="rail">Rail</option>
              <option value="air">Air</option>
              <option value="ship">Ship</option>
            </select>
          </div>
          <div>
            <label>Dispatch Name</label>
            <input
              style={inputStyle}
              value={transportDetails.dispatchName}
              onChange={(e) => setTransportDetails({ ...transportDetails, dispatchName: e.target.value })}
            />
          </div>
          <div>
            <label>Dispatch Place</label>
            <input
              style={inputStyle}
              value={transportDetails.dispatchPlace}
              onChange={(e) => setTransportDetails({ ...transportDetails, dispatchPlace: e.target.value })}
            />
          </div>
          <div>
            <label>Dispatch Pincode</label>
            <input
              style={inputStyle}
              value={transportDetails.dispatchPincode}
              onChange={(e) => setTransportDetails({ ...transportDetails, dispatchPincode: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div style={sectionWrapStyle}>
        <div style={sectionTitleStyle}>Terms and Conditions</div>
        <textarea
          rows={4}
          style={{ ...inputStyle, width: "100%" }}
          value={termsConditions}
          onChange={(e) => setTermsConditions(e.target.value)}
          placeholder="You can update terms for this invoice"
        />
      </div>

      <div style={sectionWrapStyle}>
        <div style={sectionTitleStyle}>Invoice Items</div>
        <button type="button" onClick={addItem} style={{ marginBottom: 10 }}>
          Add Item
        </button>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
            <thead>
              <tr>
                {["Item Name", "HSN", "Qty", "Price", "Discount %", "Tax %", "Amount", "Action"].map((h) => (
                  <th key={h} style={{ border: "1px solid #e5e7eb", padding: 8, textAlign: "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map((item) => (
                <tr key={item.id}>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                    <input
                      style={inputStyle}
                      value={item.itemName}
                      onChange={(e) => updateItem(item.id, "itemName", e.target.value)}
                    />
                  </td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                    <input
                      style={inputStyle}
                      value={item.hsnCode}
                      onChange={(e) => updateItem(item.id, "hsnCode", e.target.value)}
                    />
                  </td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                    <input
                      type="number"
                      style={inputStyle}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value) || 0)}
                    />
                  </td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                    <input
                      type="number"
                      style={inputStyle}
                      value={item.price}
                      onChange={(e) => updateItem(item.id, "price", Number(e.target.value) || 0)}
                    />
                  </td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                    <input
                      type="number"
                      style={inputStyle}
                      value={item.discount}
                      onChange={(e) => updateItem(item.id, "discount", Number(e.target.value) || 0)}
                    />
                  </td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                    <select
                      style={inputStyle}
                      value={String(item.taxRate)}
                      onChange={(e) => updateItem(item.id, "taxRate", Number(e.target.value))}
                    >
                      <option value="0">0</option>
                      <option value="5">5</option>
                      <option value="12">12</option>
                      <option value="18">18</option>
                      <option value="28">28</option>
                    </select>
                  </td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>₹{item.amount.toFixed(2)}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                    <button type="button" onClick={() => deleteItem(item.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={sectionWrapStyle}>
        <div style={sectionTitleStyle}>Summary</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0,1fr))",
            gap: 8,
          }}
        >
          <div>Subtotal: ₹{totals.subtotal.toFixed(2)}</div>
          <div>Discount: ₹{totals.discount.toFixed(2)}</div>
          <div>CGST: ₹{totals.cgst.toFixed(2)}</div>
          <div>SGST: ₹{totals.sgst.toFixed(2)}</div>
          <div>IGST: ₹{totals.igst.toFixed(2)}</div>
          <div style={{ fontWeight: 700 }}>Total: ₹{totals.total.toFixed(2)}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={createInvoice}
        disabled={isSubmitting}
        style={{
          background: "#2563eb",
          color: "#fff",
          border: 0,
          borderRadius: 8,
          padding: "10px 16px",
          cursor: "pointer",
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        {isSubmitting ? "Saving..." : "Create Invoice"}
      </button>
    </form>
  )
}
