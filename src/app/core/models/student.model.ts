export interface Student {
  id?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  enrollmentStatus: string;
  joinedDate?: string;
  ageGroupId?: number | null;
  ageGroupLabel?: string;
}

export interface Guardian {
  id?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  relationship: string;
  primary: boolean;
  linkNotes?: string;
}

export interface StudentNote {
  id?: number;
  studentId?: number;
  note: string;
  createdAt?: string;
}

export interface StudentDetail {
  student: Student;
  guardians: Guardian[];
  notes: StudentNote[];
}

export interface CreateStudentRequest {
  student: Partial<Student>;
  guardians: Partial<Guardian>[];
}
