export interface AuthFormField {
  name: string;
  label: string;
  type: string;
  placeholder: string;
  required?: boolean;
  grid?: boolean;
}

export const SIGN_IN_FIELDS: AuthFormField[] = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'name@example.com',
    required: true,
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    required: true,
  },
];

export const SIGN_UP_NAME_FIELDS: AuthFormField[] = [
  { name: 'firstName', label: 'First name', type: 'text', placeholder: 'John', grid: true },
  { name: 'lastName', label: 'Last name', type: 'text', placeholder: 'Doe', grid: true },
];

export const SIGN_UP_FIELDS: AuthFormField[] = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'name@example.com',
    required: true,
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Create a password',
    required: true,
  },
  {
    name: 'confirmPassword',
    label: 'Confirm password',
    type: 'password',
    placeholder: 'Confirm your password',
    required: true,
  },
];

export const USER_CREATE_NAME_FIELDS: AuthFormField[] = [
  { name: 'firstName', label: 'First name', type: 'text', placeholder: 'John', grid: true },
  { name: 'lastName', label: 'Last name', type: 'text', placeholder: 'Doe', grid: true },
];

export const USER_CREATE_FIELDS: AuthFormField[] = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'user@example.com',
    required: true,
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Min. 10 characters',
    required: true,
  },
];
