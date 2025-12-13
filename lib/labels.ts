export const labels = [
  {
    value: "work",
    label: "Work",
    "bg-color": "bg-blue-100",
    "text-color": "text-blue-800",
    "border-color": "border-blue-300",
  },
  {
    value: "personal",
    label: "Personal",
    "bg-color": "bg-green-100",
    "text-color": "text-green-800",
    "border-color": "border-green-300",
  },
  {
    value: "shopping",
    label: "Shopping",
    "bg-color": "bg-yellow-100",
    "text-color": "text-yellow-800",
    "border-color": "border-yellow-300",
  },
  {
    value: "home",
    label: "Home",
    "bg-color": "bg-purple-100",
    "text-color": "text-purple-800",
    "border-color": "border-purple-300",
  },
  {
    value: "priority",
    label: "Priority",
    "bg-color": "bg-red-100",
    "text-color": "text-red-800",
    "border-color": "border-red-300",
  },
] as const;

export type LabelType = (typeof labels)[number]["value"];

export const getLabelColors = (label: string) => {
  const labelObj = labels.find((l) => l.value === label);
  return {
    "bg-color": labelObj?.["bg-color"] || "bg-gray-500",
    "text-color": labelObj?.["text-color"] || "text-gray-500",
    "border-color": labelObj?.["border-color"] || "border-gray-500",
  };
};
