import type { CustomizedResume } from "@/lib/types";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-5 border-b border-slate-200 pb-1 text-xs font-bold uppercase tracking-wider text-brand-700">
      {children}
    </h3>
  );
}

export default function ResumePreview({ resume }: { resume: CustomizedResume }) {
  const { contact } = resume;
  const contactBits = [contact.email, contact.phone, contact.location, ...(contact.links ?? [])].filter(
    Boolean,
  );

  return (
    <article
      id="resume-document"
      className="mx-auto w-full max-w-[820px] break-words bg-white p-5 text-sm text-slate-700 sm:p-8"
    >
      <header className="text-center">
        {contact.name && (
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{contact.name}</h2>
        )}
        {contact.headline && (
          <p className="mt-0.5 text-sm font-semibold text-brand-700">{contact.headline}</p>
        )}
        {contactBits.length > 0 && (
          <p className="mt-1.5 break-words text-xs text-slate-500">
            {contactBits.join("  -  ")}
          </p>
        )}
      </header>

      {resume.summary && (
        <section>
          <SectionHeading>Professional Summary</SectionHeading>
          <p className="leading-relaxed">{resume.summary}</p>
        </section>
      )}

      {resume.skills?.length > 0 && (
        <section>
          <SectionHeading>Skills</SectionHeading>
          <p className="leading-relaxed">{resume.skills.join("  -  ")}</p>
        </section>
      )}

      {resume.experience?.length > 0 && (
        <section>
          <SectionHeading>Experience</SectionHeading>
          <div className="space-y-4">
            {resume.experience.map((job, index) => (
              <div key={index}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-semibold text-slate-900">
                    {[job.title, job.company].filter(Boolean).join(" | ")}
                  </p>
                  {job.dates && <span className="text-xs text-slate-500">{job.dates}</span>}
                </div>
                {job.location && <p className="text-xs italic text-slate-500">{job.location}</p>}
                {job.bullets?.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-1 pl-5">
                    {job.bullets.map((bullet, i) => (
                      <li key={i} className="leading-relaxed">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.projects?.length > 0 && (
        <section>
          <SectionHeading>Projects</SectionHeading>
          <div className="space-y-3">
            {resume.projects.map((project, index) => (
              <div key={index}>
                <p className="font-semibold text-slate-900">{project.name}</p>
                {project.description && <p className="leading-relaxed">{project.description}</p>}
                {project.bullets?.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-1 pl-5">
                    {project.bullets.map((bullet, i) => (
                      <li key={i} className="leading-relaxed">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.education?.length > 0 && (
        <section>
          <SectionHeading>Education</SectionHeading>
          <div className="space-y-2">
            {resume.education.map((edu, index) => (
              <div key={index}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-semibold text-slate-900">
                    {[edu.degree, edu.institution].filter(Boolean).join(" | ")}
                  </p>
                  {edu.dates && <span className="text-xs text-slate-500">{edu.dates}</span>}
                </div>
                {edu.details && <p className="text-xs text-slate-600">{edu.details}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.certifications?.length > 0 && (
        <section>
          <SectionHeading>Certifications</SectionHeading>
          <ul className="list-disc space-y-1 pl-5">
            {resume.certifications.map((cert, index) => (
              <li key={index} className="leading-relaxed">
                {cert}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
