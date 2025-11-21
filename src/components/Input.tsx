import React, { forwardRef } from "react";

type InputRootProps = React.HTMLAttributes<HTMLDivElement>;

const Root = forwardRef<HTMLDivElement, InputRootProps>(({ className = "", ...props }, ref) => (
  <div ref={ref} className={`space-y-2 ${className}`.trim()} {...props} />
));
Root.displayName = "Input.Root";

type InputLabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const Label = forwardRef<HTMLLabelElement, InputLabelProps>(({ className = "", ...props }, ref) => (
  <label
    ref={ref}
    className={`block text-sm font-medium text-black ${className}`.trim()}
    {...props}
  />
));
Label.displayName = "Input.Label";

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  wrapperClassName?: string;
  endAdornment?: React.ReactNode;
  error?: string;
};

const Field = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ className = "", wrapperClassName = "", endAdornment, error, ...props }, ref) => {
    const hasAdornment = endAdornment !== undefined;
    const hasError = Boolean(error);

    return (
      <div className={`relative ${wrapperClassName}`.trim()}>
        <input
          ref={ref}
          className={`w-full rounded-sm border px-4 py-2 transition-colors focus:outline-none ${
            hasError
              ? "border-red-500 bg-white text-black focus:border-red-600"
              : "border-gray-400 bg-white text-black focus:border-black"
          } ${hasAdornment ? "pr-12" : ""} ${className}`.trim()}
          {...props}
        />
        {endAdornment && (
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center justify-center">
            {endAdornment}
          </div>
        )}
      </div>
    );
  },
);
Field.displayName = "Input.Field";

type InputHintProps = React.HTMLAttributes<HTMLParagraphElement>;

const Hint = forwardRef<HTMLParagraphElement, InputHintProps>(
  ({ className = "", ...props }, ref) => (
    <p ref={ref} className={`text-xs text-gray-600 ${className}`.trim()} {...props} />
  ),
);
Hint.displayName = "Input.Hint";

type InputErrorProps = React.HTMLAttributes<HTMLParagraphElement> & {
  message?: string;
};

const Error = forwardRef<HTMLParagraphElement, InputErrorProps>(
  ({ message, className = "", ...props }, ref) => {
    if (!message) return null;

    return (
      <p ref={ref} className={`text-xs text-red-600 ${className}`.trim()} {...props}>
        • {message}
      </p>
    );
  },
);
Error.displayName = "Input.Error";

export const Input = {
  Root,
  Label,
  Field,
  Hint,
  Error,
};
