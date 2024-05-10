"use client";
import Image from "next/image";
import Link from "next/link";

import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

export default function Navbar() {
    return (
        <div className="flex h-[80px] w-full justify-between items-center px-16 fixed">
            <Link href="/"><Image
                src="/images/paketeer.png"
                width={70}
                height={80}
                alt="Ship a Parcel"
                priority={true}
            />
            </Link>
            <div>
                <NavigationMenu>
                    <NavigationMenuList className="gap-10">
                        <NavigationMenuItem className="bg-inherit">
                            <Link href="/" legacyBehavior passHref>
                                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                    Track Package
                                </NavigationMenuLink>
                            </Link>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <Link href="/ship" legacyBehavior passHref>
                                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                    Ship a Parcel
                                </NavigationMenuLink>
                            </Link>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <Link href="/packing" legacyBehavior passHref>
                                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                    Packing & Delivery
                                </NavigationMenuLink>
                            </Link>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>
            </div>
            <div><Link href="/packstations" legacyBehavior passHref>
                Parcel Service Points
            </Link></div>
        </div>
    );
}

