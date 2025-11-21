import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Eye, EyeClosed, Loader } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/Input";
import { mapZodErrors, type FieldErrors } from "@/helpers/zodError";
import { login, loginSchema } from "@/functions";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/login/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const loginFn = useServerFn(login);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    isLoading: false,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const result = loginSchema.safeParse({
        email: formData.email,
        password: formData.password,
      });

      if (!result.success) {
        setFieldErrors(mapZodErrors(result.error));
      } else {
        setFieldErrors({});
        setFormData((prev) => ({
          ...prev,
          isLoading: true,
        }));

        const req = await loginFn({
          data: {
            email: result.data.email,
            password: result.data.password,
          },
        });

        if (req.error) {
          setFieldErrors({
            email: req.error,
            password: req.error,
          });
          setFormData((prev) => ({
            ...prev,
            isLoading: false,
          }));

          return;
        }

        navigate({
          to: "/app",
        });

        return;
      }
    },
    [formData],
  );

  return (
    <div className="bg-grey-bg flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-sm border border-gray-300 bg-white p-10">
        <h2 className="mb-8 text-3xl font-semibold tracking-tight text-black">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input.Root>
            <Input.Label htmlFor="email">Email</Input.Label>
            <Input.Field
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              error={fieldErrors.email}
            />
            {!fieldErrors.email && <Input.Hint>Enter a valid email</Input.Hint>}
            <Input.Error message={fieldErrors.email} />
          </Input.Root>

          <Input.Root>
            <Input.Label htmlFor="password">Password</Input.Label>
            <Input.Field
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              error={fieldErrors.password}
              endAdornment={
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="text-gray-600 transition-colors hover:text-black"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeClosed className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              }
            />
            {!fieldErrors.password && <Input.Hint>Minimum 6 characters</Input.Hint>}
            <Input.Error message={fieldErrors.password} />
          </Input.Root>
          <button
            type="submit"
            disabled={formData.isLoading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-sm bg-black px-4 py-3 font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed"
          >
            {formData.isLoading ? <Loader className="size-4 animate-spin" /> : <span>Login</span>}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/register" className="font-medium text-black hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
