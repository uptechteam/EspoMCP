import { Contact, Account, Opportunity, Lead, Task, Meeting, User, Team, Email, GenericEntity } from "../espocrm/types.js";

/**
 * Appends any extra fields (including custom fields) that aren't in the known set.
 * This ensures custom fields from any EspoCRM instance are displayed automatically
 * without requiring hardcoded field definitions.
 */
function formatExtraFields(entity: Record<string, any>, knownFields: Set<string>): string {
  let extra = '';
  for (const [key, value] of Object.entries(entity)) {
    if (knownFields.has(key)) continue;
    if (value === null || value === undefined || value === '') continue;
    // Skip internal/link ID fields that aren't useful to display
    if (key.endsWith('Id') || key.endsWith('Ids') || key === 'deleted') continue;
    const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    if (key.includes('At') && typeof value === 'string') {
      extra += `${label}: ${formatDateTime(value)}\n`;
    } else if (Array.isArray(value)) {
      extra += `${label}: ${value.join(', ')}\n`;
    } else if (typeof value === 'object') {
      extra += `${label}: ${JSON.stringify(value)}\n`;
    } else {
      extra += `${label}: ${value}\n`;
    }
  }
  return extra;
}

export function formatContactResults(contacts: Contact[]): string {
  if (!contacts || contacts.length === 0) {
    return "No contacts found.";
  }

  const formatted = contacts.map(contact => {
    const id = contact.id ? `[${contact.id}] ` : '';
    const name = `${contact.firstName} ${contact.lastName}`;
    const email = contact.emailAddress ? ` (${contact.emailAddress})` : '';
    const account = contact.accountName ? ` - ${contact.accountName}` : '';
    const phone = contact.phoneNumber ? ` | Phone: ${contact.phoneNumber}` : '';
    return `${id}${name}${email}${account}${phone}`;
  }).join('\n');

  return `Found ${contacts.length} contact${contacts.length === 1 ? '' : 's'}:\n${formatted}`;
}

export function formatAccountResults(accounts: Account[]): string {
  if (!accounts || accounts.length === 0) {
    return "No accounts found.";
  }

  const formatted = accounts.map(account => {
    const id = account.id ? `[${account.id}] ` : '';
    const type = account.type ? ` (${account.type})` : '';
    const industry = account.industry ? ` | ${account.industry}` : '';
    const website = account.website ? ` | ${account.website}` : '';
    return `${id}${account.name}${type}${industry}${website}`;
  }).join('\n');

  return `Found ${accounts.length} account${accounts.length === 1 ? '' : 's'}:\n${formatted}`;
}

export function formatOpportunityResults(opportunities: Opportunity[]): string {
  if (!opportunities || opportunities.length === 0) {
    return "No opportunities found.";
  }

  const formatted = opportunities.map(opp => {
    const id = opp.id ? `[${opp.id}] ` : '';
    const amount = opp.amount ? ` | ${formatCurrency(opp.amount)}` : '';
    const probability = opp.probability ? ` | ${opp.probability}%` : '';
    const account = opp.accountName ? ` | ${opp.accountName}` : '';
    return `${id}${opp.name} (${opp.stage})${amount}${probability}${account} | Close: ${opp.closeDate}`;
  }).join('\n');

  return `Found ${opportunities.length} opportunit${opportunities.length === 1 ? 'y' : 'ies'}:\n${formatted}`;
}

export function formatLeadResults(leads: Lead[]): string {
  if (!leads || leads.length === 0) {
    return "No leads found.";
  }

  const formatted = leads.map(lead => {
    const id = lead.id ? `[${lead.id}] ` : '';
    const name = `${lead.firstName} ${lead.lastName}`;
    const email = lead.emailAddress ? ` (${lead.emailAddress})` : '';
    const company = lead.accountName ? ` | ${lead.accountName}` : '';
    const source = ` | Source: ${lead.source}`;
    return `${id}${name}${email} (${lead.status})${company}${source}`;
  }).join('\n');

  return `Found ${leads.length} lead${leads.length === 1 ? '' : 's'}:\n${formatted}`;
}

export function formatTaskResults(tasks: Task[]): string {
  if (!tasks || tasks.length === 0) {
    return "No tasks found.";
  }

  const formatted = tasks.map(task => {
    const id = task.id ? `[${task.id}] ` : '';
    const priority = task.priority !== 'Normal' ? ` [${task.priority}]` : '';
    const assignee = task.assignedUserName ? ` | Assigned: ${task.assignedUserName}` : '';
    const parent = task.parentName ? ` | Related: ${task.parentName}` : '';
    const dueDate = task.dateEnd ? ` | Due: ${formatDate(task.dateEnd)}` : '';
    return `${id}${task.name} (${task.status})${priority}${assignee}${parent}${dueDate}`;
  }).join('\n');

  return `Found ${tasks.length} task${tasks.length === 1 ? '' : 's'}:\n${formatted}`;
}

export function formatTaskDetails(task: Task): string {
  const KNOWN = new Set(['id', 'name', 'status', 'priority', 'dateStart', 'dateEnd',
    'dateStartDate', 'dateEndDate', 'assignedUserId', 'assignedUserName',
    'parentType', 'parentId', 'parentName', 'description', 'createdAt', 'modifiedAt']);

  let details = `Task Details:\n`;
  details += `Name: ${task.name}\n`;
  details += `Status: ${task.status}\n`;
  details += `Priority: ${task.priority}\n`;

  if (task.assignedUserName) details += `Assigned User: ${task.assignedUserName}\n`;
  if (task.parentType && task.parentName) details += `Related to: ${task.parentName} (${task.parentType})\n`;
  if (task.dateStart) details += `Start Date: ${formatDateTime(task.dateStart)}\n`;
  if (task.dateEnd) details += `Due Date: ${formatDateTime(task.dateEnd)}\n`;
  if (task.dateStartDate) details += `Start Date (Date only): ${formatDate(task.dateStartDate)}\n`;
  if (task.dateEndDate) details += `Due Date (Date only): ${formatDate(task.dateEndDate)}\n`;
  if (task.description) details += `Description: ${task.description}\n`;
  details += formatExtraFields(task, KNOWN);
  if (task.createdAt) details += `Created: ${formatDateTime(task.createdAt)}\n`;
  if (task.modifiedAt) details += `Modified: ${formatDateTime(task.modifiedAt)}\n`;

  return details.trim();
}

export function formatLeadDetails(lead: Lead): string {
  const KNOWN = new Set(['id', 'firstName', 'lastName', 'emailAddress', 'phoneNumber',
    'accountName', 'website', 'status', 'source', 'industry',
    'assignedUserId', 'assignedUserName', 'description', 'createdAt', 'modifiedAt']);

  let details = `Lead Details:\n`;
  details += `Name: ${lead.firstName} ${lead.lastName}\n`;
  details += `Status: ${lead.status}\n`;
  details += `Source: ${lead.source}\n`;

  if (lead.emailAddress) details += `Email: ${lead.emailAddress}\n`;
  if (lead.phoneNumber) details += `Phone: ${lead.phoneNumber}\n`;
  if (lead.accountName) details += `Company: ${lead.accountName}\n`;
  if (lead.website) details += `Website: ${lead.website}\n`;
  if (lead.industry) details += `Industry: ${lead.industry}\n`;
  if (lead.assignedUserName) details += `Assigned User: ${lead.assignedUserName}\n`;
  if (lead.description) details += `Description: ${lead.description}\n`;
  details += formatExtraFields(lead, KNOWN);
  if (lead.createdAt) details += `Created: ${formatDateTime(lead.createdAt)}\n`;
  if (lead.modifiedAt) details += `Modified: ${formatDateTime(lead.modifiedAt)}\n`;

  return details.trim();
}

export function formatTeamResults(teams: Team[]): string {
  if (!teams || teams.length === 0) {
    return "No teams found.";
  }

  const formatted = teams.map(team => {
    const description = team.description ? ` | ${team.description}` : '';
    const memberCount = team.positionList?.length ? ` | ${team.positionList.length} positions` : '';
    return `${team.name}${description}${memberCount}`;
  }).join('\n');

  return `Found ${teams.length} team${teams.length === 1 ? '' : 's'}:\n${formatted}`;
}

export function formatGenericEntityResults(entities: GenericEntity[], entityType: string): string {
  if (!entities || entities.length === 0) {
    return `No ${entityType} records found.`;
  }

  // Hard cap: never return more than 30KB of text from a generic entity search
  const MAX_OUTPUT_CHARS = 30_000;
  // Truncate individual field values longer than this
  const MAX_FIELD_VALUE_LENGTH = 200;

  // Standard display fields that get special treatment in the summary line
  const SUMMARY_FIELDS = new Set(['id', 'name', 'firstName', 'lastName', 'emailAddress', 'status']);
  // Fields that tend to be huge and should be excluded from generic search results
  const EXCLUDED_FIELDS = new Set(['body', 'bodyPlain', 'data', 'teamsIds', 'teamsNames', 'attachmentsIds', 'attachmentsNames', 'attachmentsTypes', 'isHtml', 'isRead', 'isImportant', 'isUsers', 'isReplied', 'isSystem', 'hasAttachment', 'parentName', 'accountName', 'createdByName', 'modifiedByName', 'assignedUserName', 'personStringData', 'from', 'to', 'cc', 'bcc', 'replyTo', 'messageId', 'messageIdInternal', 'icsContents', 'icsEventData']);

  let output = `Found ${entities.length} ${entityType} record${entities.length === 1 ? '' : 's'}:\n`;

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const name = entity.name
      || (entity.firstName && entity.lastName ? `${entity.firstName} ${entity.lastName}` : null)
      || entity.id
      || '(unknown)';
    const email = entity.emailAddress ? ` (${entity.emailAddress})` : '';
    const status = entity.status ? ` | Status: ${entity.status}` : '';

    // Output any additional fields (e.g. custom fields passed via select)
    const extras = Object.entries(entity)
      .filter(([key, value]) =>
        !SUMMARY_FIELDS.has(key) &&
        !EXCLUDED_FIELDS.has(key) &&
        value !== null &&
        value !== undefined &&
        value !== '' &&
        typeof value !== 'object'
      )
      .map(([key, value]) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
        let display = String(value);
        if (display.length > MAX_FIELD_VALUE_LENGTH) {
          display = display.slice(0, MAX_FIELD_VALUE_LENGTH) + '...';
        }
        return `  ${label}: ${display}`;
      })
      .join('\n');

    output += `${name}${email}${status}${extras ? '\n' + extras : ''}`;
    if (i < entities.length - 1) output += '\n---\n';

    // Check if we've exceeded the output cap
    if (output.length > MAX_OUTPUT_CHARS) {
      const remaining = entities.length - i - 1;
      output += `\n\n... truncated. ${remaining} more record${remaining === 1 ? '' : 's'} not shown. Use more specific filters or pagination to narrow results.`;
      break;
    }
  }

  return output;
}

export function formatGenericEntityDetails(entity: GenericEntity, entityType: string): string {
  let details = `${entityType} Details:\n`;

  // Add common fields first
  if (entity.id) details += `ID: ${entity.id}\n`;
  if (entity.name) details += `Name: ${entity.name}\n`;
  if (entity.firstName && entity.lastName) details += `Name: ${entity.firstName} ${entity.lastName}\n`;
  if (entity.emailAddress) details += `Email: ${entity.emailAddress}\n`;
  if (entity.phoneNumber) details += `Phone: ${entity.phoneNumber}\n`;
  if (entity.status) details += `Status: ${entity.status}\n`;
  if (entity.description) details += `Description: ${entity.description}\n`;

  // Add all other fields
  for (const [key, value] of Object.entries(entity)) {
    if (!['id', 'name', 'firstName', 'lastName', 'emailAddress', 'phoneNumber', 'status', 'description'].includes(key)) {
      if (value !== null && value !== undefined && value !== '') {
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
        if (key.includes('At') && typeof value === 'string') {
          details += `${formattedKey}: ${formatDateTime(value)}\n`;
        } else {
          details += `${formattedKey}: ${value}\n`;
        }
      }
    }
  }

  return details.trim();
}

export function formatContactDetails(contact: Contact): string {
  const KNOWN = new Set(['id', 'firstName', 'lastName', 'emailAddress', 'phoneNumber', 'title',
    'department', 'accountId', 'accountName', 'assignedUserId', 'assignedUserName',
    'description', 'createdAt', 'modifiedAt']);

  let details = `Contact Details:\n`;
  details += `Name: ${contact.firstName} ${contact.lastName}\n`;

  if (contact.emailAddress) details += `Email: ${contact.emailAddress}\n`;
  if (contact.phoneNumber) details += `Phone: ${contact.phoneNumber}\n`;
  if (contact.title) details += `Title: ${contact.title}\n`;
  if (contact.department) details += `Department: ${contact.department}\n`;
  if (contact.accountName) details += `Account: ${contact.accountName}\n`;
  if (contact.assignedUserName) details += `Assigned User: ${contact.assignedUserName}\n`;
  if (contact.description) details += `Description: ${contact.description}\n`;
  details += formatExtraFields(contact, KNOWN);
  if (contact.createdAt) details += `Created: ${formatDateTime(contact.createdAt)}\n`;
  if (contact.modifiedAt) details += `Modified: ${formatDateTime(contact.modifiedAt)}\n`;

  return details.trim();
}

export function formatAccountDetails(account: Account): string {
  const KNOWN = new Set(['id', 'name', 'type', 'industry', 'website', 'emailAddress', 'phoneNumber',
    'assignedUserId', 'assignedUserName', 'description', 'billingAddress', 'shippingAddress',
    'createdAt', 'modifiedAt']);

  let details = `Account Details:\n`;
  details += `Name: ${account.name}\n`;

  if (account.type) details += `Type: ${account.type}\n`;
  if (account.industry) details += `Industry: ${account.industry}\n`;
  if (account.website) details += `Website: ${account.website}\n`;
  if (account.emailAddress) details += `Email: ${account.emailAddress}\n`;
  if (account.phoneNumber) details += `Phone: ${account.phoneNumber}\n`;
  if (account.assignedUserName) details += `Assigned User: ${account.assignedUserName}\n`;
  if (account.description) details += `Description: ${account.description}\n`;
  details += formatExtraFields(account, KNOWN);
  if (account.createdAt) details += `Created: ${formatDateTime(account.createdAt)}\n`;
  if (account.modifiedAt) details += `Modified: ${formatDateTime(account.modifiedAt)}\n`;

  return details.trim();
}

export function formatOpportunityDetails(opportunity: Opportunity): string {
  const KNOWN = new Set(['id', 'name', 'stage', 'closeDate', 'amount', 'probability',
    'accountId', 'accountName', 'assignedUserId', 'assignedUserName', 'nextStep',
    'description', 'createdAt', 'modifiedAt']);

  let details = `Opportunity Details:\n`;
  details += `Name: ${opportunity.name}\n`;
  details += `Stage: ${opportunity.stage}\n`;
  details += `Close Date: ${opportunity.closeDate}\n`;

  if (opportunity.amount) details += `Amount: ${formatCurrency(opportunity.amount)}\n`;
  if (opportunity.probability) details += `Probability: ${opportunity.probability}%\n`;
  if (opportunity.accountName) details += `Account: ${opportunity.accountName}\n`;
  if (opportunity.assignedUserName) details += `Assigned User: ${opportunity.assignedUserName}\n`;
  if (opportunity.nextStep) details += `Next Step: ${opportunity.nextStep}\n`;
  if (opportunity.description) details += `Description: ${opportunity.description}\n`;
  details += formatExtraFields(opportunity, KNOWN);
  if (opportunity.createdAt) details += `Created: ${formatDateTime(opportunity.createdAt)}\n`;
  if (opportunity.modifiedAt) details += `Modified: ${formatDateTime(opportunity.modifiedAt)}\n`;

  return details.trim();
}

export function formatMeetingResults(meetings: Meeting[]): string {
  if (!meetings || meetings.length === 0) {
    return "No meetings found.";
  }

  const formatted = meetings.map(meeting => {
    const id = meeting.id ? `[${meeting.id}] ` : '';
    const dateTime = `${formatDateTime(meeting.dateStart)} - ${formatDateTime(meeting.dateEnd)}`;
    const location = meeting.location ? ` | ${meeting.location}` : '';
    const attendees = meeting.contacts?.length ? ` | ${meeting.contacts.length} attendees` : '';
    return `${id}${meeting.name} (${meeting.status}) | ${dateTime}${location}${attendees}`;
  }).join('\n');

  return `Found ${meetings.length} meeting${meetings.length === 1 ? '' : 's'}:\n${formatted}`;
}

export function formatMeetingDetails(meeting: Meeting): string {
  const KNOWN = new Set(['id', 'name', 'status', 'dateStart', 'dateEnd', 'location',
    'description', 'assignedUserId', 'assignedUserName', 'parentType', 'parentId', 'parentName',
    'contacts', 'users', 'googleEventId', 'createdAt', 'modifiedAt']);

  let details = `Meeting Details:\n`;
  details += `Name: ${meeting.name}\n`;
  details += `Status: ${meeting.status}\n`;
  details += `Start: ${formatDateTime(meeting.dateStart)}\n`;
  details += `End: ${formatDateTime(meeting.dateEnd)}\n`;

  if (meeting.location) details += `Location: ${meeting.location}\n`;
  if (meeting.description) details += `Description: ${meeting.description}\n`;
  if (meeting.assignedUserName) details += `Assigned User: ${meeting.assignedUserName}\n`;
  if (meeting.parentName) details += `Related to: ${meeting.parentName}\n`;
  if (meeting.googleEventId) details += `Google Event ID: ${meeting.googleEventId}\n`;
  if (meeting.contacts?.length) details += `Contacts: ${meeting.contacts.length} attendees\n`;
  details += formatExtraFields(meeting, KNOWN);
  if (meeting.createdAt) details += `Created: ${formatDateTime(meeting.createdAt)}\n`;
  if (meeting.modifiedAt) details += `Modified: ${formatDateTime(meeting.modifiedAt)}\n`;

  return details.trim();
}

export function formatUserResults(users: User[]): string {
  if (!users || users.length === 0) {
    return "No users found.";
  }

  const formatted = users.map(user => {
    const name = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.userName;
    const email = user.emailAddress ? ` (${user.emailAddress})` : '';
    const type = user.type ? ` | ${user.type}` : '';
    const status = user.isActive === false ? ' | Inactive' : '';
    return `${name}${email}${type}${status}`;
  }).join('\n');

  return `Found ${users.length} user${users.length === 1 ? '' : 's'}:\n${formatted}`;
}

export function formatUserDetails(user: User): string {
  const KNOWN = new Set(['id', 'userName', 'firstName', 'lastName', 'emailAddress',
    'phoneNumber', 'isActive', 'type', 'createdAt', 'modifiedAt']);

  let details = `User Details:\n`;
  details += `Username: ${user.userName}\n`;

  if (user.firstName && user.lastName) details += `Name: ${user.firstName} ${user.lastName}\n`;
  if (user.emailAddress) details += `Email: ${user.emailAddress}\n`;
  if (user.phoneNumber) details += `Phone: ${user.phoneNumber}\n`;
  if (user.type) details += `Type: ${user.type}\n`;
  details += `Active: ${user.isActive !== false ? 'Yes' : 'No'}\n`;
  details += formatExtraFields(user, KNOWN);
  if (user.createdAt) details += `Created: ${formatDateTime(user.createdAt)}\n`;
  if (user.modifiedAt) details += `Modified: ${formatDateTime(user.modifiedAt)}\n`;

  return details.trim();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateTimeString: string): string {
  try {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateTimeString;
  }
}

export function formatCallResults(calls: any[]): string {
  if (!calls || calls.length === 0) {
    return "No calls found.";
  }

  const formatted = calls.map(call => {
    const direction = call.direction ? ` (${call.direction})` : '';
    const contact = call.parentName ? ` | Contact: ${call.parentName}` : '';
    const duration = call.duration ? ` | Duration: ${call.duration}s` : '';
    const date = call.dateStart ? ` | ${formatDateTime(call.dateStart)}` : '';
    return `${call.name || 'Call'}${direction} (${call.status})${contact}${duration}${date}`;
  }).join('\n');

  return `Found ${calls.length} call${calls.length === 1 ? '' : 's'}:\n${formatted}`;
}

export function formatCaseResults(cases: any[]): string {
  if (!cases || cases.length === 0) {
    return "No cases found.";
  }

  const formatted = cases.map(caseRecord => {
    const priority = caseRecord.priority && caseRecord.priority !== 'Medium' ? ` [${caseRecord.priority}]` : '';
    const type = caseRecord.type ? ` | Type: ${caseRecord.type}` : '';
    const account = caseRecord.accountName ? ` | Account: ${caseRecord.accountName}` : '';
    const assignee = caseRecord.assignedUserName ? ` | Assigned: ${caseRecord.assignedUserName}` : '';
    return `${caseRecord.name || caseRecord.subject} (${caseRecord.status})${priority}${type}${account}${assignee}`;
  }).join('\n');

  return `Found ${cases.length} case${cases.length === 1 ? '' : 's'}:\n${formatted}`;
}

export function formatNoteResults(notes: any[]): string {
  if (!notes || notes.length === 0) {
    return "No notes found.";
  }

  const formatted = notes.map(note => {
    const parent = note.parentName ? ` | Related: ${note.parentName} (${note.parentType})` : '';
    const author = note.createdByName ? ` | By: ${note.createdByName}` : '';
    const date = note.createdAt ? ` | ${formatDateTime(note.createdAt)}` : '';
    const preview = note.post ? ` | "${note.post.substring(0, 50)}${note.post.length > 50 ? '...' : ''}"` : '';
    return `${note.name || 'Note'}${parent}${author}${date}${preview}`;
  }).join('\n');

  return `Found ${notes.length} note${notes.length === 1 ? '' : 's'}:\n${formatted}`;
}

export function formatEmailResults(emails: Email[]): string {
  if (!emails || emails.length === 0) {
    return "No emails found.";
  }

  const formatted = emails.map(email => {
    const id = email.id ? `[${email.id}] ` : '';
    const from = email.fromString ? ` | From: ${email.fromString}` : (email.from ? ` | From: ${email.from}` : '');
    const to = email.to ? ` | To: ${email.to}` : '';
    const date = email.dateSent ? ` | ${formatDateTime(email.dateSent)}` : (email.createdAt ? ` | ${formatDateTime(email.createdAt)}` : '');
    const parent = email.parentName ? ` | Related: ${email.parentName}` : '';
    return `${id}${email.name} (${email.status})${from}${to}${date}${parent}`;
  }).join('\n');

  return `Found ${emails.length} email${emails.length === 1 ? '' : 's'}:\n${formatted}`;
}

export function formatEmailDetails(email: Email): string {
  const KNOWN = new Set(['id', 'name', 'status', 'from', 'to', 'cc', 'bcc', 'body', 'bodyPlain',
    'isHtml', 'dateSent', 'parentType', 'parentId', 'parentName', 'accountId', 'accountName',
    'assignedUserId', 'assignedUserName', 'hasAttachment', 'createdAt', 'modifiedAt']);

  let details = `Email Details:\n`;
  details += `Subject: ${email.name}\n`;
  details += `Status: ${email.status}\n`;

  if (email.from) details += `From: ${email.from}\n`;
  if (email.to) details += `To: ${email.to}\n`;
  if (email.cc) details += `CC: ${email.cc}\n`;
  if (email.bcc) details += `BCC: ${email.bcc}\n`;
  if (email.dateSent) details += `Date Sent: ${formatDateTime(email.dateSent)}\n`;
  if (email.parentName) details += `Related to: ${email.parentName} (${email.parentType})\n`;
  if (email.accountName) details += `Account: ${email.accountName}\n`;
  if (email.assignedUserName) details += `Assigned User: ${email.assignedUserName}\n`;
  if (email.hasAttachment) details += `Has Attachment: Yes\n`;

  // Body — prefer plain text for readability, fall back to HTML
  const bodyContent = email.bodyPlain || email.body;
  if (bodyContent) {
    // Truncate very long bodies
    const maxBodyLength = 2000;
    const truncated = bodyContent.length > maxBodyLength
      ? bodyContent.slice(0, maxBodyLength) + '\n... [truncated]'
      : bodyContent;
    details += `\n--- Body ---\n${truncated}\n--- End Body ---\n`;
  }

  details += formatExtraFields(email, KNOWN);
  if (email.createdAt) details += `Created: ${formatDateTime(email.createdAt)}\n`;
  if (email.modifiedAt) details += `Modified: ${formatDateTime(email.modifiedAt)}\n`;

  return details.trim();
}

export function formatLargeResultSet<T>(items: T[], formatter: (items: T[]) => string, maxItems = 20): string {
  if (items.length <= maxItems) {
    return formatter(items);
  }

  const displayed = items.slice(0, maxItems);
  const remaining = items.length - maxItems;

  return formatter(displayed) + `\n... and ${remaining} more item${remaining === 1 ? '' : 's'} (use pagination to see more)`;
}
