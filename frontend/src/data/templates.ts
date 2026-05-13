export interface TemplateField {
  key: string;
  label: string;
  type: "text" | "date" | "number" | "textarea" | "select";
  placeholder: string;
  required: boolean;
  options?: string[];
}

export interface LegalTemplate {
  id: string;
  title: string;
  category: "criminal" | "civil" | "consumer" | "rti" | "family" | "property" | "employment";
  description: string;
  useCase: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedTime: string;
  fields: TemplateField[];
  template: string;
}

export const LEGAL_TEMPLATES: LegalTemplate[] = [
  // ─── Bail Application ────────────────────────────────────────────────────
  {
    id: "bail-application",
    title: "Bail Application",
    category: "criminal",
    description: "Application for regular bail before Sessions Court or High Court",
    useCase: "Use when an accused person is in custody and wants to apply for bail",
    difficulty: "medium",
    estimatedTime: "15 minutes",
    fields: [
      { key: "court_name",       label: "Court Name",                  type: "text",     placeholder: "e.g. Sessions Court, Mumbai",          required: true },
      { key: "case_number",      label: "Case Number",                 type: "text",     placeholder: "e.g. Sessions Case No. 123/2024",      required: true },
      { key: "applicant_name",   label: "Applicant Name (Accused)",    type: "text",     placeholder: "Full name of accused",                 required: true },
      { key: "applicant_age",    label: "Age",                         type: "number",   placeholder: "Age in years",                         required: true },
      { key: "applicant_address",label: "Address",                     type: "textarea", placeholder: "Full residential address",             required: true },
      { key: "offence",          label: "Offence Charged With",        type: "text",     placeholder: "e.g. Section 302 IPC",                 required: true },
      { key: "arrest_date",      label: "Date of Arrest",              type: "date",     placeholder: "",                                     required: true },
      { key: "grounds",          label: "Grounds for Bail",            type: "textarea", placeholder: "Reasons why bail should be granted...", required: true },
      { key: "surety_name",      label: "Surety Name",                 type: "text",     placeholder: "Name of person offering surety",       required: false },
      { key: "advocate_name",    label: "Advocate Name",               type: "text",     placeholder: "Your lawyer's name",                   required: true },
      { key: "date",             label: "Date of Application",         type: "date",     placeholder: "",                                     required: true },
    ],
    template: `IN THE {{court_name}}

BAIL APPLICATION NO. _____ OF {{year}}

IN THE MATTER OF:
State vs {{applicant_name}}
{{case_number}}

APPLICATION FOR BAIL UNDER SECTION 437/439 Cr.P.C.

TO,
THE HON'BLE COURT

RESPECTFULLY SHOWETH:

1. That the applicant {{applicant_name}}, aged {{applicant_age}} years, residing at {{applicant_address}}, is the accused in the above-mentioned case.

2. That the applicant was arrested on {{arrest_date}} in connection with the alleged offence under {{offence}}.

3. That the applicant is in custody since the date of arrest and the applicant humbly prays for bail on the following grounds:

{{grounds}}

4. That the applicant undertakes to:
   a) Attend the court on all dates of hearing
   b) Not tamper with evidence or witnesses
   c) Not leave the jurisdiction without prior permission of the court
   d) Surrender passport if required

5. That {{surety_name}} is willing to stand as surety for the applicant.

PRAYER:
It is therefore most respectfully prayed that this Hon'ble Court may be pleased to release the applicant on bail on such terms and conditions as this Hon'ble Court may deem fit and proper, in the interest of justice.

Place: _____
Date: {{date}}

Respectfully submitted,

{{applicant_name}}
(Applicant/Accused)

Through:
{{advocate_name}}
(Advocate)`,
  },

  // ─── Legal Notice ────────────────────────────────────────────────────────
  {
    id: "legal-notice",
    title: "Legal Notice",
    category: "civil",
    description: "Formal legal notice sent before filing a civil case",
    useCase: "Send before filing a case to give the other party a chance to resolve the matter",
    difficulty: "easy",
    estimatedTime: "10 minutes",
    fields: [
      { key: "sender_name",       label: "Your Name (Sender)",          type: "text",     placeholder: "Your full name",                                    required: true },
      { key: "sender_address",    label: "Your Address",                type: "textarea", placeholder: "Your full address",                                 required: true },
      { key: "recipient_name",    label: "Recipient Name",              type: "text",     placeholder: "Name of person/company you are sending notice to",  required: true },
      { key: "recipient_address", label: "Recipient Address",           type: "textarea", placeholder: "Full address of recipient",                         required: true },
      { key: "subject",           label: "Subject of Notice",           type: "text",     placeholder: "e.g. Non-payment of dues, Property dispute",        required: true },
      { key: "facts",             label: "Facts & Background",          type: "textarea", placeholder: "Describe what happened and the dispute...",         required: true },
      { key: "demand",            label: "Your Demand",                 type: "textarea", placeholder: "What you want the recipient to do...",              required: true },
      { key: "days",              label: "Days to Respond",             type: "select",   placeholder: "",                                                  required: true, options: ["7", "15", "30", "60"] },
      { key: "advocate_name",     label: "Advocate Name",               type: "text",     placeholder: "Your lawyer's name",                               required: true },
      { key: "date",              label: "Date",                        type: "date",     placeholder: "",                                                  required: true },
    ],
    template: `LEGAL NOTICE

Date: {{date}}

FROM:
{{sender_name}}
{{sender_address}}

TO:
{{recipient_name}}
{{recipient_address}}

SUBJECT: {{subject}}

Sir/Madam,

Under instructions from and on behalf of my client {{sender_name}}, I hereby serve upon you the following legal notice:

FACTS:
{{facts}}

DEMAND:
In view of the above facts and circumstances, my client demands that you:
{{demand}}

You are hereby called upon to comply with the above demand within {{days}} days from the receipt of this notice, failing which my client shall be constrained to initiate appropriate legal proceedings against you before the competent court of law, at your risk, cost and consequences.

This notice is without prejudice to my client's rights and remedies, all of which are expressly reserved.

Yours faithfully,

{{advocate_name}}
(Advocate)
On behalf of {{sender_name}}`,
  },

  // ─── RTI Application ─────────────────────────────────────────────────────
  {
    id: "rti-application",
    title: "RTI Application",
    category: "rti",
    description: "Right to Information application to get information from government",
    useCase: "Use to request any information from a government department or public authority",
    difficulty: "easy",
    estimatedTime: "10 minutes",
    fields: [
      { key: "pio_designation",    label: "Public Information Officer Designation", type: "text",     placeholder: "e.g. Public Information Officer",          required: true },
      { key: "department",         label: "Department/Office Name",                 type: "text",     placeholder: "e.g. Municipal Corporation of Delhi",      required: true },
      { key: "department_address", label: "Department Address",                     type: "textarea", placeholder: "Full address of the department",           required: true },
      { key: "applicant_name",     label: "Your Name",                              type: "text",     placeholder: "Your full name",                           required: true },
      { key: "applicant_address",  label: "Your Address",                           type: "textarea", placeholder: "Your full address",                        required: true },
      { key: "applicant_phone",    label: "Phone Number",                           type: "text",     placeholder: "Your contact number",                      required: true },
      { key: "information_sought", label: "Information Sought",                     type: "textarea", placeholder: "Describe clearly what information you need...", required: true },
      { key: "period",             label: "Period of Information",                  type: "text",     placeholder: "e.g. From 2020 to 2024",                   required: false },
      { key: "date",               label: "Date",                                   type: "date",     placeholder: "",                                         required: true },
    ],
    template: `APPLICATION UNDER RIGHT TO INFORMATION ACT, 2005

Date: {{date}}

TO,
The {{pio_designation}}
{{department}}
{{department_address}}

FROM:
{{applicant_name}}
{{applicant_address}}
Phone: {{applicant_phone}}

SUBJECT: Request for Information under RTI Act 2005

Respected Sir/Madam,

I, {{applicant_name}}, a citizen of India, hereby request the following information under the Right to Information Act, 2005:

INFORMATION SOUGHT:
{{information_sought}}

Period: {{period}}

I am enclosing the application fee of Rs. 10/- (Rupees Ten only) by way of ___________________

I request you to provide the above information within 30 days as mandated under Section 7 of the RTI Act, 2005.

If the information requested is held by or relates to another public authority, please transfer this application to that authority as per Section 6(3) of the RTI Act.

Thanking you,
Yours faithfully,

{{applicant_name}}
(Applicant)

Enclosures:
1. Application fee of Rs. 10/-
2. Identity proof (if required)`,
  },

  // ─── Consumer Complaint ──────────────────────────────────────────────────
  {
    id: "consumer-complaint",
    title: "Consumer Complaint",
    category: "consumer",
    description: "Complaint to Consumer Disputes Redressal Commission",
    useCase: "Use when a product or service has caused loss or deficiency and you want compensation",
    difficulty: "medium",
    estimatedTime: "20 minutes",
    fields: [
      { key: "forum_name",       label: "Consumer Forum Name",                  type: "text",     placeholder: "e.g. District Consumer Disputes Redressal Commission, Mumbai", required: true },
      { key: "complainant_name", label: "Your Name",                            type: "text",     placeholder: "Your full name",                                               required: true },
      { key: "complainant_address", label: "Your Address",                      type: "textarea", placeholder: "Your full address",                                            required: true },
      { key: "opposite_party",   label: "Opposite Party (Company/Person)",      type: "text",     placeholder: "Name of company or person you are complaining against",        required: true },
      { key: "op_address",       label: "Opposite Party Address",               type: "textarea", placeholder: "Address of the company/person",                               required: true },
      { key: "purchase_date",    label: "Date of Purchase/Service",             type: "date",     placeholder: "",                                                             required: true },
      { key: "amount_paid",      label: "Amount Paid (Rs.)",                    type: "number",   placeholder: "Amount in rupees",                                             required: true },
      { key: "deficiency",       label: "Nature of Deficiency/Complaint",       type: "textarea", placeholder: "Describe the defect, deficiency, or unfair trade practice...", required: true },
      { key: "relief_sought",    label: "Relief Sought",                        type: "textarea", placeholder: "What compensation or action you want...",                      required: true },
      { key: "date",             label: "Date",                                 type: "date",     placeholder: "",                                                             required: true },
    ],
    template: `BEFORE THE {{forum_name}}

CONSUMER COMPLAINT NO. _____ OF {{year}}

IN THE MATTER OF:
{{complainant_name}}
{{complainant_address}}
                                                    ...COMPLAINANT

VERSUS

{{opposite_party}}
{{op_address}}
                                                    ...OPPOSITE PARTY

COMPLAINT UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019

RESPECTFULLY SHOWETH:

1. That the complainant is a consumer as defined under Section 2(7) of the Consumer Protection Act, 2019.

2. That on {{purchase_date}}, the complainant purchased goods/availed services from the Opposite Party for a sum of Rs. {{amount_paid}}/-.

3. NATURE OF DEFICIENCY/COMPLAINT:
{{deficiency}}

4. That the complainant has suffered loss and injury due to the deficiency in service/defective product of the Opposite Party.

RELIEF SOUGHT:
The Complainant most respectfully prays that this Hon'ble Forum may be pleased to:
{{relief_sought}}

And/or grant any other relief as this Hon'ble Forum may deem fit and proper in the circumstances of the case.

Place: _____
Date: {{date}}

{{complainant_name}}
(Complainant)`,
  },

  // ─── Anticipatory Bail ───────────────────────────────────────────────────
  {
    id: "anticipatory-bail",
    title: "Anticipatory Bail Application",
    category: "criminal",
    description: "Application for anticipatory bail under Section 438 CrPC before arrest",
    useCase: "Use when you apprehend arrest and want protection before police can arrest you",
    difficulty: "hard",
    estimatedTime: "20 minutes",
    fields: [
      { key: "court_name",        label: "Court Name",                      type: "text",     placeholder: "e.g. Sessions Court, Delhi",                    required: true },
      { key: "applicant_name",    label: "Applicant Name",                  type: "text",     placeholder: "Your full name",                               required: true },
      { key: "applicant_age",     label: "Age",                             type: "number",   placeholder: "Age in years",                                 required: true },
      { key: "applicant_address", label: "Address",                         type: "textarea", placeholder: "Your full address",                            required: true },
      { key: "fir_number",        label: "FIR Number (if registered)",      type: "text",     placeholder: "e.g. FIR No. 123/2024 or 'Not yet registered'", required: true },
      { key: "police_station",    label: "Police Station",                  type: "text",     placeholder: "Name of police station",                       required: true },
      { key: "offence",           label: "Offence Apprehended",             type: "text",     placeholder: "e.g. Section 420 IPC",                         required: true },
      { key: "grounds",           label: "Grounds for Anticipatory Bail",   type: "textarea", placeholder: "Why you apprehend arrest and why bail should be granted...", required: true },
      { key: "advocate_name",     label: "Advocate Name",                   type: "text",     placeholder: "Your lawyer's name",                           required: true },
      { key: "date",              label: "Date",                            type: "date",     placeholder: "",                                             required: true },
    ],
    template: `IN THE {{court_name}}

ANTICIPATORY BAIL APPLICATION NO. _____ OF {{year}}

IN THE MATTER OF:
{{applicant_name}}
Age: {{applicant_age}} years
{{applicant_address}}
                                                    ...APPLICANT

APPLICATION UNDER SECTION 438 OF THE CODE OF CRIMINAL PROCEDURE, 1973

TO,
THE HON'BLE COURT

RESPECTFULLY SHOWETH:

1. That the applicant {{applicant_name}} apprehends arrest by the police of {{police_station}} Police Station in connection with {{fir_number}} for the alleged offence under {{offence}}.

2. GROUNDS FOR ANTICIPATORY BAIL:
{{grounds}}

3. That the applicant is a law-abiding citizen and has deep roots in the society.

4. That the applicant undertakes to:
   a) Make himself/herself available for interrogation whenever required
   b) Not tamper with evidence or influence witnesses
   c) Not leave India without prior permission of court
   d) Surrender passport if directed

PRAYER:
It is therefore most respectfully prayed that this Hon'ble Court may be pleased to grant anticipatory bail to the applicant under Section 438 CrPC on such terms and conditions as this Court may deem fit.

Date: {{date}}

{{applicant_name}}
(Applicant)

Through:
{{advocate_name}}
(Advocate)`,
  },

  // ─── Rent Agreement ──────────────────────────────────────────────────────
  {
    id: "rent-agreement",
    title: "Rent Agreement",
    category: "property",
    description: "Standard residential rent/lease agreement between landlord and tenant",
    useCase: "Use when renting out or renting a property",
    difficulty: "easy",
    estimatedTime: "15 minutes",
    fields: [
      { key: "landlord_name",     label: "Landlord Name",             type: "text",     placeholder: "Full name of owner",                required: true },
      { key: "landlord_address",  label: "Landlord Address",          type: "textarea", placeholder: "Permanent address of landlord",     required: true },
      { key: "tenant_name",       label: "Tenant Name",               type: "text",     placeholder: "Full name of tenant",               required: true },
      { key: "tenant_address",    label: "Tenant Permanent Address",  type: "textarea", placeholder: "Permanent address of tenant",       required: true },
      { key: "property_address",  label: "Property Address",          type: "textarea", placeholder: "Full address of rented property",   required: true },
      { key: "rent_amount",       label: "Monthly Rent (Rs.)",        type: "number",   placeholder: "Monthly rent in rupees",            required: true },
      { key: "deposit_amount",    label: "Security Deposit (Rs.)",    type: "number",   placeholder: "Security deposit amount",           required: true },
      { key: "start_date",        label: "Agreement Start Date",      type: "date",     placeholder: "",                                  required: true },
      { key: "duration",          label: "Duration",                  type: "select",   placeholder: "",                                  required: true, options: ["11 months", "1 year", "2 years", "3 years"] },
      { key: "date",              label: "Date of Agreement",         type: "date",     placeholder: "",                                  required: true },
    ],
    template: `RENT AGREEMENT

This Rent Agreement is made on {{date}} between:

LANDLORD:
{{landlord_name}}
{{landlord_address}}
(hereinafter referred to as the "Landlord")

AND

TENANT:
{{tenant_name}}
{{tenant_address}}
(hereinafter referred to as the "Tenant")

PROPERTY:
The Landlord agrees to rent to the Tenant the property situated at:
{{property_address}}

TERMS AND CONDITIONS:

1. DURATION: This agreement shall be for a period of {{duration}} commencing from {{start_date}}.

2. RENT: The monthly rent shall be Rs. {{rent_amount}}/- payable on or before the 5th of each month.

3. SECURITY DEPOSIT: The Tenant has paid a security deposit of Rs. {{deposit_amount}}/- which shall be refunded at the time of vacating, subject to deductions for damages if any.

4. USE: The property shall be used for residential purposes only.

5. MAINTENANCE: The Tenant shall maintain the property in good condition and shall not make any structural changes without written consent of the Landlord.

6. UTILITIES: The Tenant shall pay electricity, water, and other utility bills directly.

7. TERMINATION: Either party may terminate this agreement with one month's written notice.

8. SUBLETTING: The Tenant shall not sublet the property without written consent of the Landlord.

IN WITNESS WHEREOF, the parties have signed this agreement on the date mentioned above.

LANDLORD                          TENANT
{{landlord_name}}                 {{tenant_name}}

WITNESSES:
1. _________________              2. _________________`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getTemplatesByCategory(category: string): LegalTemplate[] {
  if (category === "all") return LEGAL_TEMPLATES;
  return LEGAL_TEMPLATES.filter((t) => t.category === category);
}

export const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  criminal:   { label: "Criminal",   color: "#b91c1c", bg: "rgba(220,38,38,0.08)",   border: "rgba(220,38,38,0.3)" },
  civil:      { label: "Civil",      color: "#1d4ed8", bg: "rgba(37,99,235,0.08)",   border: "rgba(37,99,235,0.3)" },
  consumer:   { label: "Consumer",   color: "#15803d", bg: "rgba(22,163,74,0.08)",   border: "rgba(22,163,74,0.3)" },
  rti:        { label: "RTI",        color: "#92400e", bg: "rgba(217,119,6,0.08)",   border: "rgba(217,119,6,0.3)" },
  family:     { label: "Family",     color: "#6d28d9", bg: "rgba(124,58,237,0.08)",  border: "rgba(124,58,237,0.3)" },
  property:   { label: "Property",   color: "#0f2744", bg: "rgba(15,39,68,0.08)",    border: "rgba(15,39,68,0.25)" },
  employment: { label: "Employment", color: "#0e7490", bg: "rgba(8,145,178,0.08)",   border: "rgba(8,145,178,0.3)" },
};

export const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  easy:   { label: "Easy",   color: "#15803d", bg: "rgba(22,163,74,0.1)" },
  medium: { label: "Medium", color: "#92400e", bg: "rgba(217,119,6,0.1)" },
  hard:   { label: "Hard",   color: "#b91c1c", bg: "rgba(220,38,38,0.1)" },
};
