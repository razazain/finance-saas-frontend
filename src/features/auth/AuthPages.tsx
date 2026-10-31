import type { ReactNode } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { authApi } from "@/lib/api/services";
import { setAccessToken, getApiErrorMessage } from "@/lib/api/client";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import type { Role } from "@/types";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  mfaCode: z.string().optional(),
});
type LoginValues = z.infer<typeof loginSchema>;
const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  businessName: z.string().trim().min(2, "Enter a business name."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
  country: z.string().min(1),
  currency: z.string().min(1),
});
type RegisterValues = z.infer<typeof registerSchema>;

function AuthFrame({
  children,
  asideTitle = "A clearer view of your business finances.",
  asideText = "Bring income, expenses, customers and bills together in one calm, organized workspace.",
}: {
  children: ReactNode;
  asideTitle?: string;
  asideText?: string;
}) {
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="auth-brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>Munshee</strong>
          </div>
        </div>
        <div className="auth-aside-content">
          <div className="auth-art-icon">
            <div className="art-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="art-trend">↗</div>
          </div>
          <h2>{asideTitle}</h2>
          <p>{asideText}</p>
          <div className="auth-aside-bottom">
            <div className="avatar-stack">
              <span>AR</span>
              <span>HS</span>
              <span>MK</span>
            </div>
            <small>Built for the people behind small businesses.</small>
          </div>
        </div>
        <div className="auth-aside-footer">
          Secure workspace · Clear financial records
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-form-wrap">
          {children}
          <p className="auth-legal">
            By continuing, you agree to the workspace terms and privacy policy.
          </p>
        </div>
      </main>
    </div>
  );
}

export function LoginPage() {
  const { signIn, toast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("Owner");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", mfaCode: "" },
  });
  const onSubmit = async (values: LoginValues) => {
    try {
      const result = await authApi.login({
        ...values,
        ...(values.mfaCode?.trim()
          ? { mfaCode: values.mfaCode.trim() }
          : { mfaCode: undefined }),
      });
      if (!result?.accessToken)
        throw new Error("The server did not return an access token.");
      setAccessToken(result.accessToken);
      const serverRole = String(result.user?.role || "owner").toLowerCase();
      signIn(
        serverRole === "admin"
          ? "Admin"
          : serverRole === "employee"
            ? "Employee"
            : "Owner",
        result.user,
      );
      toast({
        title: "Signed in successfully",
        description: `Welcome to Munshee${result.user?.name ? `, ${result.user.name}` : ""}.`,
        tone: "success",
      });
      const from =
        (location.state as { from?: string } | null)?.from ?? "/dashboard";
      navigate(from);
    } catch (error) {
      toast({
        title: "Unable to sign in",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    }
  };
  return (
    <AuthFrame>
      <div className="auth-eyebrow">
        <ShieldCheck size={15} /> Secure business workspace
      </div>
      <h1>Welcome back</h1>
      <p className="auth-intro">Sign in to manage your business finances.</p>
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Email address" required error={errors.email?.message}>
          <div className="input-with-icon">
            <Mail size={16} />
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              {...register("email")}
            />
          </div>
        </Field>
        <Field label="Password" required error={errors.password?.message}>
          <div className="input-with-icon">
            <LockKeyhole size={16} />
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              {...register("password")}
            />
            <button
              type="button"
              className="input-trailing"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <Field label="Authenticator code (if enabled)">
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="Optional 6-digit code"
            {...register("mfaCode")}
          />
        </Field>
        <div className="auth-form-helpers">
          <label className="checkbox-row">
            <input type="checkbox" /> <span>Keep me signed in</span>
          </label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <Button type="submit" className="auth-submit" loading={isSubmitting}>
          Sign in <ArrowRight size={16} />
        </Button>
      </form>
      <div className="auth-divider">
        <span>New to Munshee?</span>
      </div>
      <Link to="/register" className="auth-secondary-link">
        Create an account
      </Link>
    </AuthFrame>
  );
}
function InfoDot() {
  return <span className="info-dot">i</span>;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { toast, signIn } = useApp();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      businessName: "",
      email: "",
      password: "",
      country: "Pakistan",
      currency: "PKR",
    },
  });
  const onSubmit = async (values: RegisterValues) => {
    try {
      const result = await authApi.register(values);
      if (result?.accessToken) {
        setAccessToken(result.accessToken);
        signIn("Owner", result.user);
      }
      sessionStorage.setItem("munshee-pending-email", values.email);
      toast({
        title: "Account created",
        description: "Check your inbox for the verification email.",
        tone: "success",
      });
      navigate("/verify-email");
    } catch (error) {
      toast({
        title: "Registration failed",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    }
  };
  return (
    <AuthFrame
      asideTitle="Start with a clearer financial picture."
      asideText="Create a workspace for the people, payments and records that keep your business moving."
    >
      <div className="auth-eyebrow">
        <ShieldCheck size={15} /> Create a workspace
      </div>
      <h1>Create your account</h1>
      <p className="auth-intro">
        Set up your business workspace. You can refine settings later.
      </p>
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Your full name" required error={errors.name?.message}>
          <Input placeholder="e.g. Ayesha Rahman" {...register("name")} />
        </Field>
        <Field
          label="Business name"
          required
          error={errors.businessName?.message}
        >
          <Input
            placeholder="e.g. Munshee Traders"
            {...register("businessName")}
          />
        </Field>
        <Field label="Work email" required error={errors.email?.message}>
          <Input
            type="email"
            placeholder="you@company.com"
            {...register("email")}
          />
        </Field>
        <Field
          label="Password"
          required
          error={errors.password?.message}
          hint="Use at least 8 characters."
        >
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            {...register("password")}
          />
        </Field>
        <div className="form-grid two">
          <Field label="Country" required>
            <Select {...register("country")}>
              <option>Pakistan</option>
              <option>United Arab Emirates</option>
              <option>United Kingdom</option>
              <option>United States</option>
              <option>Saudi Arabia</option>
            </Select>
          </Field>
          <Field label="Business currency" required>
            <Select {...register("currency")}>
              <option value="PKR">PKR — Pakistani Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="AED">AED — UAE Dirham</option>
              <option value="GBP">GBP — Pound Sterling</option>
              <option value="SAR">SAR — Saudi Riyal</option>
            </Select>
          </Field>
        </div>
        <Button type="submit" className="auth-submit" loading={isSubmitting}>
          Create workspace <ArrowRight size={16} />
        </Button>
      </form>
      <div className="auth-footer-line">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </AuthFrame>
  );
}

export function VerifyEmailPage() {
  const { data, toast } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [verified, setVerified] = useState(false);
  const email = (() => {
    try {
      return (
        sessionStorage.getItem("munshee-pending-email") ||
        data.team.find((member) => member.role === "Owner")?.email ||
        ""
      );
    } catch {
      return data.team.find((member) => member.role === "Owner")?.email || "";
    }
  })();
  return (
    <AuthFrame
      asideTitle="A trusted workspace starts with verified access."
      asideText="Keep your team and financial records protected with secure sign-in and verified contact details."
    >
      <div className="auth-state-icon state-blue">
        <Mail size={25} />
      </div>
      <h1>Check your inbox</h1>
      <p className="auth-intro">
        We sent a verification link to <strong>{email}</strong>.
      </p>
      <NoticeInline />
      <div className="auth-steps">
        <div className="auth-step active">
          <span>1</span>
          <div>
            <strong>Open your email</strong>
            <small>Look for the Munshee verification message.</small>
          </div>
        </div>
        <div className="auth-step">
          <span>2</span>
          <div>
            <strong>Verify your address</strong>
            <small>Follow the link in the email.</small>
          </div>
        </div>
        <div className="auth-step">
          <span>3</span>
          <div>
            <strong>Continue to your workspace</strong>
            <small>Return here once your email is verified.</small>
          </div>
        </div>
      </div>
      {token && (
        <Button
          className="auth-submit"
          onClick={async () => {
            try {
              await authApi.verifyEmail(token);
              setVerified(true);
              toast({ title: "Email verified", tone: "success" });
            } catch (error) {
              toast({
                title: "Verification failed",
                description: getApiErrorMessage(error),
                tone: "error",
              });
            }
          }}
        >
          {verified ? "Email verified" : "Verify email"}{" "}
          <CheckCircle2 size={16} />
        </Button>
      )}
      <button
        className="text-button centered"
        onClick={async () => {
          try {
            await authApi.resendVerification();
            toast({ title: "Verification email sent", tone: "success" });
          } catch (error) {
            toast({
              title: "Unable to resend email",
              description: getApiErrorMessage(error),
              tone: "error",
            });
          }
        }}
      >
        Resend verification email
      </button>
      <Link to="/login" className="back-link">
        <ArrowLeft size={15} /> Back to sign in
      </Link>
    </AuthFrame>
  );
}
function NoticeInline() {
  return (
    <Notice tone="info" title="Verify your email">
      Open the verification link sent by Munshee. If you opened this page from
      the email, the token will be verified here.
    </Notice>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { toast } = useApp();
  return (
    <AuthFrame
      asideTitle="Access should be secure and recoverable."
      asideText="A simple recovery flow helps you get back to the work that matters."
    >
      <div className="auth-state-icon state-blue">
        <KeyRound size={25} />
      </div>
      <h1>Forgot your password?</h1>
      <p className="auth-intro">
        Enter your work email and we'll show you the next step.
      </p>
      {sent ? (
        <>
          <Notice
            tone="success"
            title="If the address is registered, a reset link is on its way."
          >
            Check your inbox. If the account exists, the backend has sent a
            reset email.
          </Notice>
          <Button
            className="auth-submit"
            onClick={() =>
              toast({ title: "Request already submitted", tone: "info" })
            }
          >
            Request another link
          </Button>
        </>
      ) : (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.includes("@")) {
              toast({ title: "Enter a valid email address", tone: "error" });
              return;
            }
            void authApi
              .requestPasswordReset(email)
              .then(() => {
                setSent(true);
                toast({
                  title: "Password reset requested",
                  description:
                    "If the account exists, a reset email has been sent.",
                  tone: "success",
                });
              })
              .catch((error) =>
                toast({
                  title: "Request failed",
                  description: getApiErrorMessage(error),
                  tone: "error",
                }),
              );
          }}
        >
          <Field label="Email address" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </Field>
          <Button type="submit" className="auth-submit">
            Send reset link <ArrowRight size={16} />
          </Button>
        </form>
      )}
      <Link to="/login" className="back-link">
        <ArrowLeft size={15} /> Back to sign in
      </Link>
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [complete, setComplete] = useState(false);
  const navigate = useNavigate();
  const { toast } = useApp();
  return (
    <AuthFrame
      asideTitle="Protect the records behind your business."
      asideText="Use a strong password and keep access to your workspace under your control."
    >
      <div className="auth-state-icon state-blue">
        <LockKeyhole size={25} />
      </div>
      <h1>Reset your password</h1>
      <p className="auth-intro">Choose a new password for your account.</p>
      {complete ? (
        <>
          <Notice tone="success" title="Password reset complete">
            Your password has been updated by the server.
          </Notice>
          <Button className="auth-submit" onClick={() => navigate("/login")}>
            Back to sign in <ArrowRight size={16} />
          </Button>
        </>
      ) : (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (password.length < 8) {
              toast({
                title: "Password is too short",
                description: "Use at least 8 characters.",
                tone: "error",
              });
              return;
            }
            if (password !== confirm) {
              toast({ title: "Passwords do not match", tone: "error" });
              return;
            }
            void authApi
              .resetPassword({ token, password })
              .then(() => {
                setComplete(true);
                toast({ title: "Password reset complete", tone: "success" });
              })
              .catch((error) =>
                toast({
                  title: "Password reset failed",
                  description: getApiErrorMessage(error),
                  tone: "error",
                }),
              );
          }}
        >
          <Field label="New password" required>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password" required>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          <Button type="submit" className="auth-submit">
            Reset password <ArrowRight size={16} />
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}

export function MfaChallengePage() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const { toast } = useApp();
  return (
    <AuthFrame
      asideTitle="An extra layer of protection."
      asideText="Multi-factor authentication helps keep sensitive business records protected."
    >
      <div className="auth-state-icon state-blue">
        <Fingerprint size={25} />
      </div>
      <h1>Verify it's you</h1>
      <p className="auth-intro">
        Enter the 6-digit code from your authenticator app.
      </p>
      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^\d{6}$/.test(code)) {
            toast({ title: "Enter a valid 6-digit code", tone: "error" });
            return;
          }
          toast({
            title: "Please sign in again with your MFA code",
            description:
              "Enter the code in the sign-in flow when prompted by your account.",
            tone: "info",
          });
          navigate("/login");
        }}
      >
        <Field
          label="Authentication code"
          required
          hint="Use the current code from your authenticator app."
        >
          <Input
            className="otp-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000 000"
          />
        </Field>
        <Button type="submit" className="auth-submit">
          Verify and continue <ArrowRight size={16} />
        </Button>
      </form>
      <Link to="/login" className="back-link">
        <ArrowLeft size={15} /> Back to sign in
      </Link>
    </AuthFrame>
  );
}

export function AuthRouterGuard({ children }: { children: ReactNode }) {
  const { signedIn } = useApp();
  return signedIn ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}
