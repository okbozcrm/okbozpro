import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => {
  const baseStyle = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantStyles = {
    default: "border-transparent bg-gray-900 text-gray-50 hover:bg-gray-900/80",
    secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80",
    destructive: "border-transparent bg-red-500 text-gray-50 hover:bg-red-500/80",
    outline: "text-gray-900",
    success: "border-transparent bg-green-500 text-gray-50 hover:bg-green-500/80", // Custom success variant
  };

  return (
    <div
      className={`${baseStyle} ${variantStyles[variant || "default"]} ${className || ""}`}
      {...props}
    />
  );
};

export { Badge };
