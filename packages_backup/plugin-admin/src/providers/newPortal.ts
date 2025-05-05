// Define the Student interface
interface Student {
  name: string;
  email: string;
  class: string;
  course_submitted: boolean;
  examination_form_submitted: boolean;
  fee_submitted: boolean;
  fee_verified: boolean;
  attendance: number;
}

/**
 * StudentFilter class to filter student data based on various criteria
 */
export class StudentFilter {
  private students: Student[];

  /**
   * Constructor
   * @param students Array of student objects
   */
  constructor(students: Student[]) {
    this.students = students;
  }

  /**
   * Get all students
   * @returns All students
   */
  getAllStudents(): Student[] {
    return this.students;
  }

  /**
   * Filter students by course submission status
   * @param isSubmitted Boolean indicating if course is submitted
   * @returns Filtered students array
   */
  filterByCourseSubmission(isSubmitted: boolean): Student[] {
    return this.students.filter(student => student.course_submitted === isSubmitted);
  }

  /**
   * Filter students by examination form submission status
   * @param isSubmitted Boolean indicating if examination form is submitted
   * @returns Filtered students array
   */
  filterByExamFormSubmission(isSubmitted: boolean): Student[] {
    return this.students.filter(student => student.examination_form_submitted === isSubmitted);
  }

  /**
   * Filter students by fee submission status
   * @param isSubmitted Boolean indicating if fee is submitted
   * @returns Filtered students array
   */
  filterByFeeSubmission(isSubmitted: boolean): Student[] {
    return this.students.filter(student => student.fee_submitted === isSubmitted);
  }

  /**
   * Filter students by fee verification status
   * @param isVerified Boolean indicating if fee is verified
   * @returns Filtered students array
   */
  filterByFeeVerification(isVerified: boolean): Student[] {
    return this.students.filter(student => student.fee_verified === isVerified);
  }

  /**
   * Filter students by attendance threshold
   * @param minAttendance Minimum attendance percentage
   * @returns Filtered students array
   */
  filterByMinAttendance(minAttendance: number): Student[] {
    return this.students.filter(student => student.attendance >= minAttendance);
  }

  /**
   * Filter students by attendance range
   * @param minAttendance Minimum attendance percentage
   * @param maxAttendance Maximum attendance percentage
   * @returns Filtered students array
   */
  filterByAttendanceRange(minAttendance: number, maxAttendance: number): Student[] {
    return this.students.filter(
      student => student.attendance >= minAttendance && student.attendance <= maxAttendance
    );
  }

  /**
   * Combined filter for fee submission and fee verification
   * @param feeSubmitted Boolean indicating if fee is submitted
   * @param feeVerified Boolean indicating if fee is verified
   * @returns Filtered students array
   */
  filterByFeeStatus(feeSubmitted: boolean, feeVerified: boolean): Student[] {
    return this.students.filter(
      student => student.fee_submitted === feeSubmitted && student.fee_verified === feeVerified
    );
  }

  /**
   * Combined filter for course submission and exam form submission
   * @param courseSubmitted Boolean indicating if course is submitted
   * @param examFormSubmitted Boolean indicating if exam form is submitted
   * @returns Filtered students array
   */
  filterByCourseAndExamStatus(courseSubmitted: boolean, examFormSubmitted: boolean): Student[] {
    return this.students.filter(
      student => 
        student.course_submitted === courseSubmitted && 
        student.examination_form_submitted === examFormSubmitted
    );
  }

  /**
   * Combined filter for exam form submission and fee submission
   * @param examFormSubmitted Boolean indicating if exam form is submitted
   * @param feeSubmitted Boolean indicating if fee is submitted
   * @returns Filtered students array
   */
  filterByExamAndFeeStatus(examFormSubmitted: boolean, feeSubmitted: boolean): Student[] {
    return this.students.filter(
      student => 
        student.examination_form_submitted === examFormSubmitted && 
        student.fee_submitted === feeSubmitted
    );
  }

  /**
   * Filter for all submissions complete (course, exam form, fee)
   * @returns Filtered students array
   */
  filterByAllSubmissionsComplete(): Student[] {
    return this.students.filter(
      student => 
        student.course_submitted && 
        student.examination_form_submitted && 
        student.fee_submitted
    );
  }

  /**
   * Filter for any submission missing (course, exam form, fee)
   * @returns Filtered students array
   */
  filterByAnySubmissionMissing(): Student[] {
    return this.students.filter(
      student => 
        !student.course_submitted || 
        !student.examination_form_submitted || 
        !student.fee_submitted
    );
  }

  /**
   * Filter by complete verification status (fee submitted and verified)
   * @returns Filtered students array
   */
  filterByCompleteVerification(): Student[] {
    return this.students.filter(
      student => student.fee_submitted && student.fee_verified
    );
  }

  /**
   * Filter by incomplete verification status (fee submitted but not verified)
   * @returns Filtered students array
   */
  filterByIncompleteVerification(): Student[] {
    return this.students.filter(
      student => student.fee_submitted && !student.fee_verified
    );
  }

  /**
   * Filter students who are eligible for exams (all requirements met)
   * @param minAttendance Minimum attendance percentage required
   * @returns Filtered students array
   */
  filterByExamEligibility(minAttendance: number = 75): Student[] {
    return this.students.filter(
      student => 
        student.course_submitted && 
        student.examination_form_submitted && 
        student.fee_submitted &&
        student.fee_verified &&
        student.attendance >= minAttendance
    );
  }

  /**
   * Filter students who are not eligible for exams
   * @param minAttendance Minimum attendance percentage required
   * @returns Filtered students array
   */
  filterByExamIneligibility(minAttendance: number = 75): Student[] {
    return this.students.filter(
      student => 
        !student.course_submitted || 
        !student.examination_form_submitted || 
        !student.fee_submitted ||
        !student.fee_verified ||
        student.attendance < minAttendance
    );
  }

  /**
   * Advanced filter with multiple criteria
   * @param criteria Object containing filter criteria
   * @returns Filtered students array
   */
  advancedFilter(criteria: {
    courseSubmitted?: boolean;
    examFormSubmitted?: boolean;
    feeSubmitted?: boolean;
    feeVerified?: boolean;
    minAttendance?: number;
    maxAttendance?: number;
  }): Student[] {
    return this.students.filter(student => {
      // Check each criteria if it's defined
      if (criteria.courseSubmitted !== undefined && 
          student.course_submitted !== criteria.courseSubmitted) {
        return false;
      }
      
      if (criteria.examFormSubmitted !== undefined && 
          student.examination_form_submitted !== criteria.examFormSubmitted) {
        return false;
      }
      
      if (criteria.feeSubmitted !== undefined && 
          student.fee_submitted !== criteria.feeSubmitted) {
        return false;
      }
      
      if (criteria.feeVerified !== undefined && 
          student.fee_verified !== criteria.feeVerified) {
        return false;
      }
      
      if (criteria.minAttendance !== undefined && 
          student.attendance < criteria.minAttendance) {
        return false;
      }
      
      if (criteria.maxAttendance !== undefined && 
          student.attendance > criteria.maxAttendance) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Search students by name (case insensitive partial match)
   * @param searchTerm Search term to look for in student names
   * @returns Filtered students array
   */
  searchByName(searchTerm: string): Student[] {
    const term = searchTerm.toLowerCase();
    return this.students.filter(
      student => student.name.toLowerCase().includes(term)
    );
  }

  /**
   * Search students by email
   * @param searchTerm Search term to look for in student emails
   * @returns Filtered students array
   */
  searchByEmail(searchTerm: string): Student[] {
    const term = searchTerm.toLowerCase();
    return this.students.filter(
      student => student.email.toLowerCase().includes(term)
    );
  }

  /**
   * Get statistics about the student data
   * @returns Object containing various statistics
   */
  getStatistics() {
    const totalStudents = this.students.length;
    const courseSubmittedCount = this.filterByCourseSubmission(true).length;
    const examFormSubmittedCount = this.filterByExamFormSubmission(true).length;
    const feeSubmittedCount = this.filterByFeeSubmission(true).length;
    const feeVerifiedCount = this.filterByFeeVerification(true).length;
    
    const attendanceValues = this.students.map(student => student.attendance);
    const totalAttendance = attendanceValues.reduce((sum, value) => sum + value, 0);
    const averageAttendance = totalAttendance / totalStudents;
    
    const eligibleStudents = this.filterByExamEligibility().length;
    
    return {
      totalStudents,
      courseSubmissionRate: (courseSubmittedCount / totalStudents) * 100,
      examFormSubmissionRate: (examFormSubmittedCount / totalStudents) * 100,
      feeSubmissionRate: (feeSubmittedCount / totalStudents) * 100,
      feeVerificationRate: (feeVerifiedCount / totalStudents) * 100,
      averageAttendance,
      eligibilityRate: (eligibleStudents / totalStudents) * 100
    };
  }
}

// Example usage:

// Parse JSON data
// const studentData: Student[] = JSON.parse(jsonString);

// Initialize filter
// const filter = new StudentFilter(studentData);

// Get all students with course submissions
// const studentsWithCourseSubmission = filter.filterByCourseSubmission(true);

// Get students eligible for exams
// const examEligibleStudents = filter.filterByExamEligibility();

// Get students who have submitted course but not exam form
// const courseSubmittedExamNotSubmitted = filter.filterByCourseAndExamStatus(true, false);

// Use advanced filter
// const advancedFiltered = filter.advancedFilter({
//   courseSubmitted: true,
//   feeSubmitted: true,
//   minAttendance: 75
// });

// Get statistics
// const stats = filter.getStatistics();