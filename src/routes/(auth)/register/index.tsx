import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { Eye, EyeClosed } from "lucide-react";
import { Input } from "@/components/Input";
import { mapZodErrors, type FieldErrors } from "@/helpers/zodError";
import { createUser } from "@/service/user";
import { useNavigate } from "@tanstack/react-router";

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const register = createServerFn({ method: "POST" })
  .inputValidator(registerSchema)
  .handler(async ({ data }) => {
    const register = await createUser(data);
    if (register.error) {
      return false;
    }

    const token = register.token;

    setCookie("token", token!, {
      path: "/",
      secure: false,
    });

    return true;
  });

export const Route = createFileRoute("/(auth)/register/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
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
      const result = registerSchema.safeParse({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      if (!result.success) {
        setFieldErrors(mapZodErrors(result.error));

        return;
      }

      setFieldErrors({});
      const req = await register({
        data: {
          username: result.data.username,
          email: result.data.email,
          password: result.data.password,
        },
      });

      if (!req) {
        setFieldErrors({
          email: "Registration failed. Please try again.",
        });

        return;
      }

      navigate({ to: "/app" });
      return;
    },
    [formData],
  );

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-sm border border-gray-300 bg-white p-10">
        <h2 className="mb-8 text-3xl font-semibold tracking-tight text-black">Register</h2>
        <Input.Hint>All fields are required</Input.Hint>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input.Root>
            <Input.Label htmlFor="username">Username</Input.Label>
            <Input.Field
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe"
              error={fieldErrors.username}
            />
            {!fieldErrors.username && <Input.Hint>Minimum 3 characters</Input.Hint>}
            <Input.Error message={fieldErrors.username} />
          </Input.Root>

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
            className="mt-2 w-full rounded-sm bg-black px-4 py-3 font-medium text-white transition-colors hover:bg-gray-800"
          >
            Register
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-black hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
