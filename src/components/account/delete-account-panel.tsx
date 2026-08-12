import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DevCodeHint } from "@/components/auth/dev-code-hint";
import OtpInput from "@/components/auth/otp-input";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, api, formatPhoneForDisplay } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Danger-zone panel for permanent account deletion. Matches the backend's
 * two-step flow: POST /account/request-otp, then DELETE /account { code }.
 */
export function DeleteAccountPanel() {
	const auth = useAuth();
	const phone =
		auth.status === "authed" && auth.customer.phone
			? formatPhoneForDisplay(auth.customer.phone)
			: null;

	const [open, setOpen] = useState(false);
	const [codeSent, setCodeSent] = useState(false);
	const [code, setCode] = useState("");
	const [devCode, setDevCode] = useState<string | null>(null);
	const [resendIn, setResendIn] = useState(0);
	const [sending, setSending] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const busy = sending || deleting;

	useEffect(() => {
		if (resendIn <= 0) return;
		const id = window.setInterval(() => setResendIn((s) => s - 1), 1000);
		return () => window.clearInterval(id);
	}, [resendIn > 0]);

	const reset = () => {
		setCodeSent(false);
		setCode("");
		setDevCode(null);
		setResendIn(0);
		setSending(false);
		setDeleting(false);
	};

	const close = () => {
		if (busy) return;
		setOpen(false);
		reset();
	};

	const sendCode = async () => {
		if (busy) return;
		setSending(true);
		try {
			const { devCode: next } = await api.me.requestDeleteOtp();
			setDevCode(next ?? null);
			setCode("");
			setCodeSent(true);
			setResendIn(RESEND_COOLDOWN_SECONDS);
			toast.success(
				phone ? `Deletion code sent to ${phone}` : "Deletion code sent",
			);
		} catch (err) {
			toast.error(
				err instanceof ApiError
					? err.message
					: "Could not send the code. Check your connection and try again.",
			);
		} finally {
			setSending(false);
		}
	};

	const confirmDelete = async (otp: string) => {
		if (busy || otp.length < OTP_LENGTH) return;
		setDeleting(true);
		try {
			await api.me.deleteAccount(otp);
			// Tokens already cleared; full reload drops React Query + auth UI.
			window.location.assign("/");
		} catch (err) {
			setCode("");
			toast.error(
				err instanceof ApiError
					? err.message
					: "Could not delete the account. Try again or contact the desk.",
			);
			setDeleting(false);
		}
	};

	return (
		<>
			<section
				className={cn(PANEL, "scroll-mt-8")}
				aria-label="Delete account"
				id="delete-account"
			>
				<div className="flex items-baseline justify-between gap-4 border-b border-foreground/15 px-6 py-4">
					<span className={MICRO}>Delete account</span>
					<span className="text-xs text-muted-foreground">Permanent</span>
				</div>

				<div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
					<div className="max-w-md">
						<p className="text-sm font-medium">Remove your Soroman account</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Deletes your login and personal data we are not required to keep.
							Spend or withdraw any wallet balance and finish open orders first.
							We confirm with a code sent to your phone. This cannot be undone.
						</p>
					</div>
					<Button
						variant="destructive"
						className="cursor-pointer shrink-0"
						onClick={() => setOpen(true)}
					>
						Delete account
					</Button>
				</div>
			</section>

			<Dialog
				open={open}
				onOpenChange={(next) => {
					if (busy) return;
					if (next) setOpen(true);
					else close();
				}}
			>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Delete your account?</DialogTitle>
						<DialogDescription>
							{codeSent
								? phone
									? `Enter the code we sent to ${phone}. You will be signed out immediately after deletion.`
									: "Enter the code we sent to your phone. You will be signed out immediately after deletion."
								: "We will text a one-time code to your phone before anything is removed. Profile and sign-in methods go; invoices we must keep for tax or disputes may remain without your login."}
						</DialogDescription>
					</DialogHeader>

					{codeSent ? (
						<div className="flex flex-col gap-3 px-5">
							<OtpInput
								value={code}
								onChange={(next) => {
									setCode(next);
									if (next.length === OTP_LENGTH) void confirmDelete(next);
								}}
								length={OTP_LENGTH}
								disabled={busy}
								label="Account deletion code"
							/>
							<DevCodeHint code={devCode} />
							<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
								<span>
									{resendIn > 0 ? `Resend in ${resendIn}s` : "Didn't get it?"}
								</span>
								<Button
									variant="link"
									size="sm"
									className="h-auto cursor-pointer px-0"
									disabled={busy || resendIn > 0}
									onClick={() => void sendCode()}
								>
									{sending ? "Sending…" : "Resend code"}
								</Button>
							</div>
						</div>
					) : null}

					<DialogFooter>
						<Button
							variant="outline"
							className="cursor-pointer"
							disabled={busy}
							onClick={close}
						>
							Keep account
						</Button>
						{codeSent ? (
							<Button
								variant="destructive"
								className="cursor-pointer"
								disabled={busy || code.length < OTP_LENGTH}
								onClick={() => void confirmDelete(code)}
							>
								{deleting ? "Deleting…" : "Delete permanently"}
							</Button>
						) : (
							<Button
								variant="destructive"
								className="cursor-pointer"
								disabled={busy}
								onClick={() => void sendCode()}
							>
								{sending ? "Sending…" : "Send deletion code"}
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
