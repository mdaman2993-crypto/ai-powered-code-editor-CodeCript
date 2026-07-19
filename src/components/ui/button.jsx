import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const motionPropKeys = new Set([
  'initial','animate','exit','whileHover','whileTap','whileFocus','whileDrag','whileInView','transition','variants','viewport','onViewportEnter','onViewportLeave'
]);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  // detect if any framer-motion props are present
  const hasMotionProps = Object.keys(props).some((k) => motionPropKeys.has(k));

  // Choose the appropriate component: Slot (when asChild), motion.button (when motion props present), or native button
  const Comp = asChild ? Slot : hasMotionProps ? motion.button : 'button';

  // If rendering a native DOM button (no motion props), strip motion-only props to avoid React warnings
  const spreadProps = hasMotionProps || asChild
    ? props
    : Object.fromEntries(Object.entries(props).filter(([k]) => !motionPropKeys.has(k)));

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...spreadProps}
    />
  );
});
Button.displayName = "Button"

export { Button, buttonVariants }
