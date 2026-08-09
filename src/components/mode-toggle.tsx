import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
	const { setTheme } = useTheme();

	return (
		<DropdownMenu>
			{/* Ghost, not outlined: the header's only filled element should be the
          primary CTA. Kept as a menu (light/dark/system) rather than a blind
          sun/moon flip so system preference stays reachable. */}
			{/* Ghost and transparent, so the wider touch target on phones is
			    invisible until pressed — see TOUCH_TARGET in components/header.tsx. */}
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="icon-sm" className="size-10 sm:size-7" />
				}
			>
				<Sun className="size-4 scale-100 rotate-0 transition-transform duration-700 ease-luxe dark:scale-0 dark:-rotate-90" />
				<Moon className="absolute size-4 scale-0 rotate-90 transition-transform duration-700 ease-luxe dark:scale-100 dark:rotate-0" />
				<span className="sr-only">Toggle theme</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={() => setTheme("light")}>
						Light
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme("dark")}>
						Dark
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme("system")}>
						System
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
