export type Assignment = {
  id: string; classId: string; schoolId: string; school: string; year: string;
  className: string; subject: string; code: string; kind: "Subject" | "Advisory";
};
export type RosterStudent = { id: string; studentCode: string; name: string };
