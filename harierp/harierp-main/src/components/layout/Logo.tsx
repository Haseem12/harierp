
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Droplets } from 'lucide-react'; // Water Icon
import React from 'react';

interface LogoProps {
  className?: string;
  icon?: React.ReactNode;
  text?: string;
}

export default function Logo({
  className,
  icon,
  text = "Hari Industries Limited"
}: LogoProps) {
  const IconComponent = icon || <Droplets className="h-10 w-10 text-primary" />;

  return (
    <Link href="/" className={cn("flex items-center gap-2 text-lg font-semibold text-primary", className)}>
      {IconComponent}
      <span className="group-data-[collapsible=icon]:hidden">{text}</span>
    </Link>
  );
}
