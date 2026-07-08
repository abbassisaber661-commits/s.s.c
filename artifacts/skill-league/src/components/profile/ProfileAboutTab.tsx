import React, { memo } from "react";
import { motion } from "framer-motion";
import {
  User, AtSign, FileText, MapPin, Globe, Calendar,
  Twitter, Instagram, Youtube, Twitch, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileData } from "@/types/profile";

const formatJoinDate = (ts?: number) => {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
};

interface FieldRowProps {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  href?: string;
  placeholder?: string;
}

const FieldRow = memo(({ icon: Icon, label, value, href, placeholder }: FieldRowProps) => {
  if (!value && !placeholder) return null;

  const inner = (
    <div
      className={cn(
        "flex items-start gap-3 py-3 px-4 rounded-xl transition-colors",
        href && value ? "hover:bg-[#F5F5F7] cursor-pointer" : ""
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        <Icon size={16} className={value ? "text-[#FFD60A]" : "text-[#E5E5E5]"} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666666] mb-0.5">
          {label}
        </p>
        {value ? (
          <p className={cn("text-sm text-[#111111] break-all", href && "text-[#666666] underline underline-offset-2")}>
            {value}
          </p>
        ) : (
          <p className="text-sm text-[#E5E5E5] italic">{placeholder}</p>
        )}
      </div>
      {href && value && <ExternalLink size={13} className="flex-shrink-0 mt-1 text-[#666666]" />}
    </div>
  );

  if (href && value) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  }
  return inner;
});
FieldRow.displayName = "FieldRow";

const Divider = () => <div className="mx-4 border-b border-[#E5E5E5]" />;

interface SocialLinkRowProps {
  platform: string;
  handle?: string;
  icon: React.ElementType;
  baseUrl: string;
  color: string;
}

const SocialLinkRow = memo(({ platform, handle, icon: Icon, baseUrl, color }: SocialLinkRowProps) => {
  if (!handle) return null;
  const url = `${baseUrl}${handle.replace("@", "")}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-[#F5F5F7] transition-colors"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: color + "20" }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[#666666] uppercase tracking-wider font-semibold">
          {platform}
        </p>
        <p className="text-sm text-[#111111] truncate font-medium">
          @{handle.replace("@", "")}
        </p>
      </div>
      <ExternalLink size={13} className="text-[#666666] flex-shrink-0" />
    </a>
  );
});
SocialLinkRow.displayName = "SocialLinkRow";

interface ProfileAboutTabProps {
  profile: ProfileData;
  isOwner?: boolean;
  onEdit?: () => void;
  /**
   * The player's real Pi Network account name — read-only, owner-only.
   * Per the username spec this is profile-info display ONLY and is never
   * the public identity (that is always `profile.username`).
   */
  piAccountName?: string | null;
}

export const ProfileAboutTab = memo(({ profile, isOwner = false, onEdit, piAccountName }: ProfileAboutTabProps) => {
  const joinDate = formatJoinDate(profile.joinedAt);

  const hasSocialLinks = !!(
    profile.socialLinks?.twitter ||
    profile.socialLinks?.instagram ||
    profile.socialLinks?.youtube ||
    profile.socialLinks?.twitch ||
    profile.socialLinks?.tiktok
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-4 space-y-3"
    >
      {/* ── Basic Info ── */}
      <section className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#111111]">Basic Info</h3>
          {isOwner && (
            <button
              onClick={onEdit}
              className="text-xs text-[#111111] font-semibold hover:text-[#666666] transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {isOwner && piAccountName && (
          <>
            <FieldRow icon={User} label="Pi Account Name" value={piAccountName} placeholder="Not provided" />
            <Divider />
          </>
        )}
        <FieldRow icon={AtSign}   label="Username"  value={profile.username ? `@${profile.username}` : undefined} />
        <Divider />
        <FieldRow icon={FileText} label="Bio"       value={profile.bio}       placeholder="No bio yet" />
        <Divider />
        <FieldRow icon={MapPin}   label="Country"   value={profile.country}   placeholder="Location not set" />
        <Divider />
        <FieldRow icon={Globe}    label="Website"   value={profile.website}   href={profile.website} placeholder="No website" />
        <Divider />
        <FieldRow icon={Calendar} label="Joined"    value={joinDate ?? undefined} placeholder="—" />
      </section>

      {/* ── Social Links ── */}
      {hasSocialLinks && (
        <section className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-[#111111]">Social Links</h3>
          </div>
          <SocialLinkRow platform="Twitter / X" handle={profile.socialLinks?.twitter}   icon={Twitter}   baseUrl="https://twitter.com/"   color="#1DA1F2" />
          <SocialLinkRow platform="Instagram"   handle={profile.socialLinks?.instagram} icon={Instagram} baseUrl="https://instagram.com/"  color="#E1306C" />
          <SocialLinkRow platform="YouTube"     handle={profile.socialLinks?.youtube}   icon={Youtube}   baseUrl="https://youtube.com/@"   color="#FF0000" />
          <SocialLinkRow platform="Twitch"      handle={profile.socialLinks?.twitch}    icon={Twitch}    baseUrl="https://twitch.tv/"      color="#9146FF" />
        </section>
      )}

      {/* ── Empty state (owner) ── */}
      {isOwner && !profile.bio && !hasSocialLinks && (
        <div className="text-center py-6 px-4">
          <p className="text-sm text-[#666666]">
            Complete your profile to help others find you.
          </p>
          <button
            onClick={onEdit}
            className="mt-3 px-4 py-2 rounded-xl bg-[#FFD60A] hover:bg-[#F5C800] text-black text-sm font-semibold transition-colors"
          >
            Complete Profile
          </button>
        </div>
      )}
    </motion.div>
  );
});

ProfileAboutTab.displayName = "ProfileAboutTab";
export default ProfileAboutTab;
