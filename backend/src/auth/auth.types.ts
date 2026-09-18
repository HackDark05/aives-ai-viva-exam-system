export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'EXAMINER' | 'ADMIN';
};
