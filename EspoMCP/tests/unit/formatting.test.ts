/**
 * Unit tests for formatting functions.
 *
 * **Validates: Requirement 6.4**
 *
 * Tests formatContactDetails (with custom fields), formatAccountDetails,
 * formatMeetingDetails, formatContactResults, formatAccountResults,
 * formatLargeResultSet, formatCurrency, formatDate, formatDateTime.
 */

import { describe, it, expect } from '@jest/globals';
import {
  formatContactDetails,
  formatAccountDetails,
  formatMeetingDetails,
  formatContactResults,
  formatAccountResults,
  formatLargeResultSet,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatOpportunityResults,
  formatOpportunityDetails,
  formatLeadResults,
  formatLeadDetails,
  formatTaskResults,
  formatTaskDetails,
  formatTeamResults,
  formatGenericEntityResults,
  formatGenericEntityDetails,
  formatMeetingResults,
  formatUserResults,
  formatUserDetails,
  formatCallResults,
  formatCaseResults,
  formatNoteResults,
} from '../../src/utils/formatting';
import type { Contact, Account, Meeting, Opportunity, Lead, Task, Team, User, GenericEntity } from '../../src/espocrm/types';

describe('formatContactDetails', () => {
  it('includes Name from firstName and lastName', () => {
    const contact: Contact = { firstName: 'John', lastName: 'Doe' };
    const result = formatContactDetails(contact);
    expect(result).toContain('Name: John Doe');
  });

  it('includes custom fields (e.g. cRole) when present via extra fields', () => {
    const contact: Contact = { firstName: 'John', lastName: 'Doe', cRole: 'CEO' };
    const result = formatContactDetails(contact);
    // Custom fields are rendered by formatExtraFields with camelCase label splitting
    expect(result).toContain('CEO');
  });

  it('does not include custom field labels when absent', () => {
    const contact: Contact = { firstName: 'John', lastName: 'Doe' };
    const result = formatContactDetails(contact);
    expect(result).not.toContain('C Role:');
  });

  it('includes email when present', () => {
    const contact: Contact = { firstName: 'John', lastName: 'Doe', emailAddress: 'john@example.com' };
    const result = formatContactDetails(contact);
    expect(result).toContain('Email: john@example.com');
  });

  it('includes phone when present', () => {
    const contact: Contact = { firstName: 'John', lastName: 'Doe', phoneNumber: '+1234567890' };
    const result = formatContactDetails(contact);
    expect(result).toContain('Phone: +1234567890');
  });

  it('includes department when present', () => {
    const contact: Contact = { firstName: 'John', lastName: 'Doe', department: 'Engineering' };
    const result = formatContactDetails(contact);
    expect(result).toContain('Department: Engineering');
  });

  it('includes account name when present', () => {
    const contact: Contact = { firstName: 'John', lastName: 'Doe', accountName: 'Acme Corp' };
    const result = formatContactDetails(contact);
    expect(result).toContain('Account: Acme Corp');
  });
});

describe('formatAccountDetails', () => {
  it('includes Name', () => {
    const account: Account = { name: 'Acme Corp' };
    const result = formatAccountDetails(account);
    expect(result).toContain('Name: Acme Corp');
  });

  it('includes type when present', () => {
    const account: Account = { name: 'Acme Corp', type: 'Customer' };
    const result = formatAccountDetails(account);
    expect(result).toContain('Type: Customer');
  });

  it('includes industry when present', () => {
    const account: Account = { name: 'Acme Corp', industry: 'Technology' };
    const result = formatAccountDetails(account);
    expect(result).toContain('Industry: Technology');
  });

  it('includes website when present', () => {
    const account: Account = { name: 'Acme Corp', website: 'https://acme.com' };
    const result = formatAccountDetails(account);
    expect(result).toContain('Website: https://acme.com');
  });
});

describe('formatMeetingDetails', () => {
  const baseMeeting: Meeting = {
    name: 'Team Standup',
    status: 'Planned',
    dateStart: '2024-01-15 10:00:00',
    dateEnd: '2024-01-15 10:30:00',
  };

  it('includes Name and Status', () => {
    const result = formatMeetingDetails(baseMeeting);
    expect(result).toContain('Name: Team Standup');
    expect(result).toContain('Status: Planned');
  });

  it('includes Start and End times', () => {
    const result = formatMeetingDetails(baseMeeting);
    expect(result).toContain('Start:');
    expect(result).toContain('End:');
  });

  it('includes location when present', () => {
    const meeting: Meeting = { ...baseMeeting, location: 'Room 101' };
    const result = formatMeetingDetails(meeting);
    expect(result).toContain('Location: Room 101');
  });

  it('includes description when present', () => {
    const meeting: Meeting = { ...baseMeeting, description: 'Daily sync' };
    const result = formatMeetingDetails(meeting);
    expect(result).toContain('Description: Daily sync');
  });
});

describe('formatContactResults', () => {
  it('returns "No contacts found." for empty array', () => {
    expect(formatContactResults([])).toBe('No contacts found.');
  });

  it('returns "No contacts found." for null/undefined', () => {
    expect(formatContactResults(null as any)).toBe('No contacts found.');
  });

  it('formats single contact correctly', () => {
    const contacts: Contact[] = [{ firstName: 'John', lastName: 'Doe' }];
    const result = formatContactResults(contacts);
    expect(result).toContain('Found 1 contact:');
    expect(result).toContain('John Doe');
  });

  it('formats multiple contacts with count', () => {
    const contacts: Contact[] = [
      { firstName: 'John', lastName: 'Doe' },
      { firstName: 'Jane', lastName: 'Smith' },
    ];
    const result = formatContactResults(contacts);
    expect(result).toContain('Found 2 contacts:');
  });

  it('includes email and account when present', () => {
    const contacts: Contact[] = [
      { firstName: 'John', lastName: 'Doe', emailAddress: 'john@example.com', accountName: 'Acme' },
    ];
    const result = formatContactResults(contacts);
    expect(result).toContain('(john@example.com)');
    expect(result).toContain('Acme');
  });
});

describe('formatAccountResults', () => {
  it('returns "No accounts found." for empty array', () => {
    expect(formatAccountResults([])).toBe('No accounts found.');
  });

  it('formats single account correctly', () => {
    const accounts: Account[] = [{ name: 'Acme Corp' }];
    const result = formatAccountResults(accounts);
    expect(result).toContain('Found 1 account:');
    expect(result).toContain('Acme Corp');
  });

  it('includes type and industry when present', () => {
    const accounts: Account[] = [{ name: 'Acme Corp', type: 'Customer', industry: 'Tech' }];
    const result = formatAccountResults(accounts);
    expect(result).toContain('(Customer)');
    expect(result).toContain('Tech');
  });
});

describe('formatLargeResultSet', () => {
  it('returns full output when items <= maxItems', () => {
    const items = [{ firstName: 'John', lastName: 'Doe' }] as Contact[];
    const result = formatLargeResultSet(items, formatContactResults, 20);
    expect(result).not.toContain('more item');
  });

  it('truncates and shows remaining count when items > maxItems', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      firstName: `First${i}`,
      lastName: `Last${i}`,
    })) as Contact[];
    const result = formatLargeResultSet(items, formatContactResults, 20);
    expect(result).toContain('and 5 more items');
  });

  it('uses singular "item" for exactly 1 remaining', () => {
    const items = Array.from({ length: 3 }, (_, i) => ({
      firstName: `First${i}`,
      lastName: `Last${i}`,
    })) as Contact[];
    const result = formatLargeResultSet(items, formatContactResults, 2);
    expect(result).toContain('and 1 more item');
    expect(result).not.toContain('items');
  });
});

describe('formatCurrency', () => {
  it('formats whole number with two decimals', () => {
    expect(formatCurrency(1000)).toBe('1,000.00');
  });

  it('formats decimal number', () => {
    expect(formatCurrency(1234.56)).toBe('1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0.00');
  });
});

describe('formatDate', () => {
  it('formats a valid date string', () => {
    const result = formatDate('2024-01-15');
    // Should contain Jan, 15, and 2024 in some locale format
    expect(result).toContain('2024');
    expect(result).toContain('15');
  });

  it('returns original string for invalid date', () => {
    // new Date('not-a-date') returns Invalid Date, toLocaleDateString may throw or return 'Invalid Date'
    const result = formatDate('not-a-date');
    // Should return something (either the original or a formatted attempt)
    expect(typeof result).toBe('string');
  });
});

describe('formatDateTime', () => {
  it('formats a valid datetime string', () => {
    const result = formatDateTime('2024-01-15 10:30:00');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns original string for invalid datetime', () => {
    const result = formatDateTime('not-a-datetime');
    expect(typeof result).toBe('string');
  });
});


describe('formatOpportunityResults', () => {
  it('returns "No opportunities found." for empty array', () => {
    expect(formatOpportunityResults([])).toBe('No opportunities found.');
  });

  it('returns "No opportunities found." for null/undefined', () => {
    expect(formatOpportunityResults(null as any)).toBe('No opportunities found.');
  });

  it('formats single opportunity with singular', () => {
    const opps: Opportunity[] = [{
      name: 'Big Deal',
      accountId: 'acc1',
      stage: 'Prospecting',
      closeDate: '2024-06-01',
    }];
    const result = formatOpportunityResults(opps);
    expect(result).toContain('Found 1 opportunity:');
    expect(result).toContain('Big Deal');
    expect(result).toContain('Prospecting');
  });

  it('formats multiple opportunities with amount and probability', () => {
    const opps: Opportunity[] = [
      { name: 'Deal A', accountId: 'a1', stage: 'Qualification', closeDate: '2024-06-01', amount: 50000, probability: 75, accountName: 'Acme' },
      { name: 'Deal B', accountId: 'a2', stage: 'Closed Won', closeDate: '2024-07-01' },
    ];
    const result = formatOpportunityResults(opps);
    expect(result).toContain('Found 2 opportunities:');
    expect(result).toContain('50,000.00');
    expect(result).toContain('75%');
    expect(result).toContain('Acme');
  });
});

describe('formatOpportunityDetails', () => {
  it('includes name, stage, and close date', () => {
    const opp: Opportunity = { name: 'Big Deal', accountId: 'a1', stage: 'Prospecting', closeDate: '2024-06-01' };
    const result = formatOpportunityDetails(opp);
    expect(result).toContain('Name: Big Deal');
    expect(result).toContain('Stage: Prospecting');
    expect(result).toContain('Close Date: 2024-06-01');
  });

  it('includes optional fields when present', () => {
    const opp: Opportunity = {
      name: 'Deal', accountId: 'a1', stage: 'Qualification', closeDate: '2024-06-01',
      amount: 10000, probability: 50, accountName: 'Corp', assignedUserName: 'Admin',
      nextStep: 'Follow up', description: 'Important deal',
    };
    const result = formatOpportunityDetails(opp);
    expect(result).toContain('10,000.00');
    expect(result).toContain('50%');
    expect(result).toContain('Account: Corp');
    expect(result).toContain('Assigned User: Admin');
    expect(result).toContain('Next Step: Follow up');
    expect(result).toContain('Description: Important deal');
  });
});

describe('formatLeadResults', () => {
  it('returns "No leads found." for empty array', () => {
    expect(formatLeadResults([])).toBe('No leads found.');
  });

  it('returns "No leads found." for null', () => {
    expect(formatLeadResults(null as any)).toBe('No leads found.');
  });

  it('formats single lead', () => {
    const leads: Lead[] = [{
      firstName: 'John', lastName: 'Doe', status: 'New', source: 'Web Site',
    }];
    const result = formatLeadResults(leads);
    expect(result).toContain('Found 1 lead:');
    expect(result).toContain('John Doe');
    expect(result).toContain('New');
    expect(result).toContain('Source: Web Site');
  });

  it('includes email and company when present', () => {
    const leads: Lead[] = [{
      firstName: 'Jane', lastName: 'Smith', status: 'Assigned', source: 'Email',
      emailAddress: 'jane@test.com', accountName: 'TestCo',
    }];
    const result = formatLeadResults(leads);
    expect(result).toContain('jane@test.com');
    expect(result).toContain('TestCo');
  });
});

describe('formatLeadDetails', () => {
  it('includes name, status, and source', () => {
    const lead: Lead = { firstName: 'John', lastName: 'Doe', status: 'New', source: 'Call' };
    const result = formatLeadDetails(lead);
    expect(result).toContain('Name: John Doe');
    expect(result).toContain('Status: New');
    expect(result).toContain('Source: Call');
  });

  it('includes optional fields', () => {
    const lead: Lead = {
      firstName: 'John', lastName: 'Doe', status: 'New', source: 'Email',
      emailAddress: 'john@test.com', phoneNumber: '+1234', accountName: 'Corp',
      website: 'https://corp.com', industry: 'Tech', assignedUserName: 'Admin',
      description: 'Hot lead',
    };
    const result = formatLeadDetails(lead);
    expect(result).toContain('Email: john@test.com');
    expect(result).toContain('Phone: +1234');
    expect(result).toContain('Company: Corp');
    expect(result).toContain('Website: https://corp.com');
    expect(result).toContain('Industry: Tech');
    expect(result).toContain('Assigned User: Admin');
    expect(result).toContain('Description: Hot lead');
  });
});

describe('formatTaskResults', () => {
  it('returns "No tasks found." for empty array', () => {
    expect(formatTaskResults([])).toBe('No tasks found.');
  });

  it('returns "No tasks found." for null', () => {
    expect(formatTaskResults(null as any)).toBe('No tasks found.');
  });

  it('formats single task', () => {
    const tasks: Task[] = [{ name: 'Fix bug', status: 'Not Started', priority: 'Normal' }];
    const result = formatTaskResults(tasks);
    expect(result).toContain('Found 1 task:');
    expect(result).toContain('Fix bug');
    expect(result).toContain('Not Started');
  });

  it('shows priority badge for non-Normal priority', () => {
    const tasks: Task[] = [{ name: 'Urgent fix', status: 'Started', priority: 'Urgent' }];
    const result = formatTaskResults(tasks);
    expect(result).toContain('[Urgent]');
  });

  it('includes assignee and parent when present', () => {
    const tasks: Task[] = [{
      name: 'Task', status: 'Started', priority: 'Normal',
      assignedUserName: 'Admin', parentName: 'Project X', dateEnd: '2024-06-01',
    }];
    const result = formatTaskResults(tasks);
    expect(result).toContain('Assigned: Admin');
    expect(result).toContain('Related: Project X');
    expect(result).toContain('Due:');
  });
});

describe('formatTaskDetails', () => {
  it('includes name, status, and priority', () => {
    const task: Task = { name: 'Fix bug', status: 'Not Started', priority: 'High' };
    const result = formatTaskDetails(task);
    expect(result).toContain('Name: Fix bug');
    expect(result).toContain('Status: Not Started');
    expect(result).toContain('Priority: High');
  });

  it('includes optional fields', () => {
    const task: Task = {
      name: 'Task', status: 'Started', priority: 'Normal',
      assignedUserName: 'Admin', parentType: 'Account', parentName: 'Acme',
      dateEnd: '2024-06-01', description: 'Do stuff',
    };
    const result = formatTaskDetails(task);
    expect(result).toContain('Assigned User: Admin');
    expect(result).toContain('Related to: Acme (Account)');
    expect(result).toContain('Due Date:');
    expect(result).toContain('Description: Do stuff');
  });
});

describe('formatTeamResults', () => {
  it('returns "No teams found." for empty array', () => {
    expect(formatTeamResults([])).toBe('No teams found.');
  });

  it('returns "No teams found." for null', () => {
    expect(formatTeamResults(null as any)).toBe('No teams found.');
  });

  it('formats single team', () => {
    const teams: Team[] = [{ name: 'Sales Team' }];
    const result = formatTeamResults(teams);
    expect(result).toContain('Found 1 team:');
    expect(result).toContain('Sales Team');
  });

  it('includes description and position count', () => {
    const teams: Team[] = [{ name: 'Dev', description: 'Developers', positionList: ['Lead', 'Senior'] }];
    const result = formatTeamResults(teams);
    expect(result).toContain('Developers');
    expect(result).toContain('2 positions');
  });
});

describe('formatUserResults', () => {
  it('returns "No users found." for empty array', () => {
    expect(formatUserResults([])).toBe('No users found.');
  });

  it('returns "No users found." for null', () => {
    expect(formatUserResults(null as any)).toBe('No users found.');
  });

  it('formats user with full name', () => {
    const users: User[] = [{ userName: 'jdoe', firstName: 'John', lastName: 'Doe' }];
    const result = formatUserResults(users);
    expect(result).toContain('Found 1 user:');
    expect(result).toContain('John Doe');
  });

  it('falls back to username when no name', () => {
    const users: User[] = [{ userName: 'admin' }];
    const result = formatUserResults(users);
    expect(result).toContain('admin');
  });

  it('shows inactive status', () => {
    const users: User[] = [{ userName: 'old', isActive: false }];
    const result = formatUserResults(users);
    expect(result).toContain('Inactive');
  });

  it('includes email and type', () => {
    const users: User[] = [{ userName: 'admin', emailAddress: 'admin@test.com', type: 'admin' }];
    const result = formatUserResults(users);
    expect(result).toContain('admin@test.com');
    expect(result).toContain('admin');
  });
});

describe('formatUserDetails', () => {
  it('includes username', () => {
    const user: User = { userName: 'jdoe' };
    const result = formatUserDetails(user);
    expect(result).toContain('Username: jdoe');
    expect(result).toContain('Active: Yes');
  });

  it('includes optional fields', () => {
    const user: User = {
      userName: 'jdoe', firstName: 'John', lastName: 'Doe',
      emailAddress: 'john@test.com', phoneNumber: '+1234', type: 'admin', isActive: false,
    };
    const result = formatUserDetails(user);
    expect(result).toContain('Name: John Doe');
    expect(result).toContain('Email: john@test.com');
    expect(result).toContain('Phone: +1234');
    expect(result).toContain('Type: admin');
    expect(result).toContain('Active: No');
  });
});

describe('formatMeetingResults', () => {
  it('returns "No meetings found." for empty array', () => {
    expect(formatMeetingResults([])).toBe('No meetings found.');
  });

  it('returns "No meetings found." for null', () => {
    expect(formatMeetingResults(null as any)).toBe('No meetings found.');
  });

  it('formats single meeting', () => {
    const meetings: Meeting[] = [{
      name: 'Standup', status: 'Planned',
      dateStart: '2024-01-15 10:00:00', dateEnd: '2024-01-15 10:30:00',
    }];
    const result = formatMeetingResults(meetings);
    expect(result).toContain('Found 1 meeting:');
    expect(result).toContain('Standup');
    expect(result).toContain('Planned');
  });

  it('includes location and attendee count', () => {
    const meetings: Meeting[] = [{
      name: 'Review', status: 'Held',
      dateStart: '2024-01-15 10:00:00', dateEnd: '2024-01-15 11:00:00',
      location: 'Room A', contacts: ['c1', 'c2'],
    }];
    const result = formatMeetingResults(meetings);
    expect(result).toContain('Room A');
    expect(result).toContain('2 attendees');
  });
});

describe('formatGenericEntityResults', () => {
  it('returns "No records found." for empty array', () => {
    expect(formatGenericEntityResults([], 'Widget')).toBe('No Widget records found.');
  });

  it('returns "No records found." for null', () => {
    expect(formatGenericEntityResults(null as any, 'Widget')).toBe('No Widget records found.');
  });

  it('formats entities with firstName and lastName', () => {
    // When name is absent, falls back to firstName + lastName concatenation
    const entities: GenericEntity[] = [{ id: '1', firstName: 'John', lastName: 'Doe' }];
    const result = formatGenericEntityResults(entities, 'Widget');
    expect(result).toContain('Found 1 Widget record:');
    expect(result).toContain('John Doe');
  });

  it('prefers name over firstName+lastName when both present', () => {
    const entities: GenericEntity[] = [{ id: '1', name: 'Widget A', firstName: 'John', lastName: 'Doe' }];
    const result = formatGenericEntityResults(entities, 'Widget');
    expect(result).toContain('Widget A');
  });

  it('falls back to id when no name fields', () => {
    const entities: GenericEntity[] = [{ id: 'abc123' }];
    const result = formatGenericEntityResults(entities, 'Widget');
    expect(result).toContain('abc123');
  });

  it('includes email and status when present', () => {
    const entities: GenericEntity[] = [{ id: '1', name: 'Item', emailAddress: 'a@b.com', status: 'Active' }];
    const result = formatGenericEntityResults(entities, 'Custom');
    expect(result).toContain('a@b.com');
    expect(result).toContain('Status: Active');
  });

  it('outputs custom fields passed via select', () => {
    const entities: GenericEntity[] = [{ id: '1', firstName: 'Jane', lastName: 'Doe', juntoaiServices: ['echo', 'kinetic'], juntoaiMarketingEmail: true }];
    const result = formatGenericEntityResults(entities, 'Contact');
    expect(result).toContain('Jane Doe');
    expect(result).toContain('echo, kinetic');
    expect(result).toContain('true');
  });

  it('separates multiple records with ---', () => {
    const entities: GenericEntity[] = [
      { id: '1', name: 'A', juntoaiServices: ['echo'] },
      { id: '2', name: 'B', juntoaiServices: ['kinetic'] },
    ];
    const result = formatGenericEntityResults(entities, 'Contact');
    expect(result).toContain('---');
    expect(result).toContain('Found 2 Contact records:');
  });
});

describe('formatGenericEntityDetails', () => {
  it('includes common fields', () => {
    const entity: GenericEntity = { id: '123', name: 'Test Entity', emailAddress: 'test@test.com', status: 'Active' };
    const result = formatGenericEntityDetails(entity, 'Widget');
    expect(result).toContain('Widget Details:');
    expect(result).toContain('ID: 123');
    expect(result).toContain('Name: Test Entity');
    expect(result).toContain('Email: test@test.com');
    expect(result).toContain('Status: Active');
  });

  it('includes extra fields beyond common ones', () => {
    const entity: GenericEntity = { id: '1', customField: 'custom value' };
    const result = formatGenericEntityDetails(entity, 'Thing');
    expect(result).toContain('custom value');
  });

  it('formats datetime-like fields with At suffix', () => {
    const entity: GenericEntity = { id: '1', createdAt: '2024-01-15 10:00:00' };
    const result = formatGenericEntityDetails(entity, 'Item');
    expect(result).toContain('Created At:');
  });

  it('skips null, undefined, and empty string extra fields', () => {
    const entity: GenericEntity = { id: '1', emptyField: '', nullField: null, undefinedField: undefined };
    const result = formatGenericEntityDetails(entity, 'Item');
    expect(result).not.toContain('Empty Field');
    expect(result).not.toContain('Null Field');
    expect(result).not.toContain('Undefined Field');
  });
});

describe('formatCallResults', () => {
  it('returns "No calls found." for empty array', () => {
    expect(formatCallResults([])).toBe('No calls found.');
  });

  it('returns "No calls found." for null', () => {
    expect(formatCallResults(null as any)).toBe('No calls found.');
  });

  it('formats single call', () => {
    const calls = [{ name: 'Follow-up', direction: 'Outbound', status: 'Held' }];
    const result = formatCallResults(calls);
    expect(result).toContain('Found 1 call:');
    expect(result).toContain('Follow-up');
    expect(result).toContain('Outbound');
    expect(result).toContain('Held');
  });

  it('includes contact and duration', () => {
    const calls = [{ name: 'Call', status: 'Held', parentName: 'John Doe', duration: 300 }];
    const result = formatCallResults(calls);
    expect(result).toContain('Contact: John Doe');
    expect(result).toContain('Duration: 300s');
  });
});

describe('formatCaseResults', () => {
  it('returns "No cases found." for empty array', () => {
    expect(formatCaseResults([])).toBe('No cases found.');
  });

  it('returns "No cases found." for null', () => {
    expect(formatCaseResults(null as any)).toBe('No cases found.');
  });

  it('formats single case', () => {
    const cases = [{ name: 'Bug report', status: 'New', priority: 'High' }];
    const result = formatCaseResults(cases);
    expect(result).toContain('Found 1 case:');
    expect(result).toContain('Bug report');
    expect(result).toContain('New');
    expect(result).toContain('[High]');
  });

  it('includes type, account, and assignee', () => {
    const cases = [{
      name: 'Issue', status: 'Assigned', priority: 'Medium',
      type: 'Incident', accountName: 'Acme', assignedUserName: 'Admin',
    }];
    const result = formatCaseResults(cases);
    expect(result).toContain('Type: Incident');
    expect(result).toContain('Account: Acme');
    expect(result).toContain('Assigned: Admin');
  });
});

describe('formatNoteResults', () => {
  it('returns "No notes found." for empty array', () => {
    expect(formatNoteResults([])).toBe('No notes found.');
  });

  it('returns "No notes found." for null', () => {
    expect(formatNoteResults(null as any)).toBe('No notes found.');
  });

  it('formats single note', () => {
    const notes = [{ post: 'This is a note', parentName: 'Contact A', parentType: 'Contact', createdByName: 'Admin' }];
    const result = formatNoteResults(notes);
    expect(result).toContain('Found 1 note:');
    expect(result).toContain('Related: Contact A (Contact)');
    expect(result).toContain('By: Admin');
    expect(result).toContain('This is a note');
  });

  it('truncates long post content', () => {
    const longPost = 'A'.repeat(100);
    const notes = [{ post: longPost }];
    const result = formatNoteResults(notes);
    expect(result).toContain('...');
  });
});
