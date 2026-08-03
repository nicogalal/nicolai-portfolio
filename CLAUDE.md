# nicolaigalal.com · Portfolio Build

Portfolio for Nicolai Galal, VP Global Brand & Creative (Podimo, previously Disney), based in Copenhagen. Targeting VP-level brand and creative leadership at companies like Google/YouTube and Netflix. Active application: Head of Creative, YouTube Creative Studio EMEA (London). The site must read as evidence of system thinking: every case is one deliberate play from a mandate he designed.

## Design system (LOCKED, ask before changing)

- Fonts: Bricolage Grotesque (display, weight 500), Instrument Sans (body). No serif, no italics as accent. Emphasis is straight cobalt Bricolage.
- Colors: white #FFFFFF; ink #1D1D1F; ink-soft #6E6E73; accent cobalt #3D3BF3 (CSS var --clay); dark band #0B0B0C; light blue on dark #7B79FF; hairlines rgba(29,29,31,0.10) and 0.22.
- Square corners everywhere. No border-radius anywhere on the site.
- NEVER use em-dashes in any site copy. Separators are middots " · ". Year ranges use en dashes (2022–Present). This is a hard rule.
- Dark full-bleed bands (#0B0B0C): homepage mandate section, case-page Results sections, next-case blocks, contact/footer close.
- Stats render as slide-style stacked two-tone lockups (value line cobalt, label line ink on white or white on dark, up to 76px Bricolage) with a right-hanging asterisk footnote. This mirrors Podimo's campaign results decks on purpose.
- Nav: sticky minimal frosted white bar, hairline bottom. Mark is an ink square badge "NG" (34px desktop, 30px mobile, white letters, links home, cobalt on hover). Five nav items stay on ONE line at every width (mobile: 9.5px caps, tightened tracking). No hamburger, no island, no chips: these were tried and rejected.
- Hero: staggered rise-in animation on load; prefers-reduced-motion disables all animation.

## Architecture

Static multi-page HTML, CSS inline per page. The four files in this folder are the new template and the source of truth: index.html, summer-campaign-case-study.html, sports-vertical-case-study.html, podimo-studios-case-study.html. When building or restyling other case pages, copy the head/CSS verbatim from sports-vertical-case-study.html.

Case order: 01 Summer on Podimo, 02 Galaxy's Edge, 03 Podimo, 04 Sports on Podimo, 05 Podimo Studios, 06 Dag en Nacht, 07 Duellen, 08 Undergrunden.

Done in the new template: index, summer-campaign, sports-vertical, podimo-studios, galaxys-edge, podimo-case-study (master brand, launching-now overhaul with permission to share). ALL NINE PAGES are now done in the new template; this folder's versions supersede the old build entirely. undergrunden-case-study.html and duellen-case-study.html are DONE in the new template (this folder's versions supersede the old build's). Duellen is embargoed until the campaign's public reveal; see its content-map entry. Podimo case imagery exports come from the Brand Presentation External deck in Figma.

## Narrative rules

- The mandate: ethos "Creativity that performs". Three lanes: Brand Systems, High-Impact Campaigns, Always-On Marketing, delivered with local creatives across six markets. Campaign portfolio model: Tentpoles (super-brands around shows/verticals), Acquirers (show-first growth engines), Engagers (locally-led retention), Key Moments (seasonal and cultural conversations).
- Each case declares its role in the system and cross-references the others.
- Sports = Tentpole. Published stats: 9.2 Million Impressions (*Across April and May alone), 5,000 Intakes (*Estimated by end of campaign run), Lower CAC (*Below both business-as-usual and campaign target: do NOT publish the exact euro figure), Higher Engagement (*25% of viewers watched nearly all of the video content; 50% watched nearly 75%).
- Summer = Key Moment. Concept "Just wait till you hear this". Funnel: TOF social-first films of everyday people telling a friend about a story; MOF in-studio content ending on cliffhangers; LOF a hard-to-refuse offer. Stats section currently has en-dash placeholders awaiting real numbers.
- Podimo Studios = Brand Systems. Production unit spun out as a creator-facing sub-brand ("creativity, not consumption"); logotype letters stack and arrange in any configuration; line "Welcome to the studios". Recognition: CC Shortlist.
- Undergrunden (2025) = Show 360, the precursor that evolved into the Tentpole model. Campaign centerpiece: "The Experiment" (Danish: Eksperimentet), celebrities exposed to the show's audio while measured with biometric tracking and facial analysis; also Podimo's first R-rated audio trailer. The case should close by connecting forward to the Tentpole model, and the Sports case should point backward to this origin.
- Before launch, verify every published figure is safe to share publicly (source decks were internal Podimo material).

## Worklist, in priority order

1. Infrastructure first: git init, initial commit, create a private GitHub repo and push, connect to Netlify (static site, no build step, publish root), confirm the preview URL loads. Every subsequent change gets committed.
2. Import Figma exports into assets/ (see structure below), 2x JPG, consistent art direction across crops.
3. Videos per the Video strategy section: compressed self-hosted cutdowns as native <video>, no Vimeo, no YouTube for Podimo material.
4. Restyle the three old-template cases and build Duellen in the new template.
5. Replace Summer's placeholder stats with real numbers, or hide the section if numbers can't be published.
6. Share layer: OG title/description/image per page (share image in the slide language: #0B0B0C, "Creativity that performs", NG badge), favicon generated from the NG badge, meta descriptions.
7. Scroll reveals: IntersectionObserver rise-in for work cards and stat rows, matching the hero's easing, disabled under prefers-reduced-motion.
8. Resume download becomes Nicolai_Galal_Resume.pdf (currently links a .docx).
9. Launch per the Deployment section, DNS last.

## Video strategy (decided, follow this)

- Self-host case films as MP4 cutdowns (30-90 seconds each, not full spots) in assets/video/, embedded as native <video> inside the existing .frame containers with art-directed poster frames. Hero loops: autoplay muted loop playsinline, no controls. Longer pieces: controls, click to play, with audio.
- Compression reference: ffmpeg -i in.mov -vf scale=1920:-2 -c:v libx264 -crf 23 -preset slow -movflags +faststart out.mp4 (add -an for muted loops; -c:a aac -b:a 128k for audio versions). Target 15-30MB per file.
- No Vimeo (rejected on cost). No YouTube embeds for Podimo material. Nicolai's Disney films live on his YouTube channel as private videos: those must be flipped to unlisted to embed, which is acceptable for Disney work since it aired publicly.
- Keep raw source video out of the repo (gitignored); only compressed web MP4s get committed.

## Deployment (decided, follow this)

- GoDaddy stays the domain registrar only. Hosting is GitHub + Netlify free tier (100GB bandwidth covers self-hosted video comfortably).
- netlify.toml in this folder sets long-cache headers for /assets/.
- Build and review everything against the Netlify preview URL (*.netlify.app).
- Launch, only after Nicolai signs off on the preview: add nicolaigalal.com as a custom domain in Netlify, then in GoDaddy DNS set the apex A record to Netlify's load balancer (75.2.60.5, verify against Netlify's current docs during setup) and CNAME www to the site's netlify.app address. SSL provisions automatically. The old GoDaddy-hosted site stays live until these records flip, so there is zero downtime and no half-built state visible.

## Content map per case (asset counts follow story beats, not a template)

Naming: every case folder takes case-hero.jpg plus slide-01.jpg through slide-NN.jpg, any count. Pages must FLEX to the material present: add or remove .frame blocks (frame-pair for pairs, frame std or wide for singles) to match what exists per case. Never pad a case with empty frames and never cut a strong image to fit a pattern.

- 01 Summer (Key Moment, rich case, visual-first layout): hero plus slide-01 to slide-08 from the Summer Campaign All-Hands deck. slide-01 and slide-08 FULL-BLEED (the "Just wait till you hear this" key art and an in-the-world shot, 2400px+); slide-02/03 TOF films from two different markets; slide-04/05/06 form a 4:5 funnel trio mirroring the page's three funnel columns (TOF scroll-stopper, MOF studio, LOF "1 MND FOR 9 KR" offer asset, which is the direct-response proof for the Google application); slide-07 the system across markets. Video: 1-2 TOF cutdowns, one MOF piece.
- 02 Galaxy's Edge (Disney): hero exists (assets/galatic_copy.webp); 2-4 style-guide spreads; environmental/launch photography. Video via unlisted YouTube if used.
- 03 Podimo master brand (the site centerpiece, built visual-first): hero plus slide-01 to slide-08 from the Brand Presentation External deck. slide-01 and slide-08 are FULL-BLEED bands (choose the two most cinematic identity images); slide-02/03 platform and pillars; slide-04/05/06 form a 4:5 trio for typography, colour, photography; slide-07 the dynamic design system in application. Export at 2x; the two bleed images ideally 2400px+ wide.
- 04 Sports (Tentpole, rich case, visual-first layout): hero plus slide-01 to slide-08 from the Sports Vertical Campaign Introduction deck. slide-01 and slide-08 are FULL-BLEED (creator ensemble and in-the-world shots, 2400px+); slide-02/03 hero film frames and the Show Strategy to SUPERBRAND slide; slide-04/05/06 form a 4:5 trio of social formats (debate, quote, reaction); slide-07 activation surfaces. Stats are native HTML, results-deck slides not needed. Video: 1-2 spot cutdowns.
- 05 Podimo Studios: hero exists (assets/podimostudios_case-hero.jpg); logotype-arrangements grid; identity applications; master-brand relationship. 3-4 slides total is right for this one.
- 06 Dag en Nacht (small case, PAGE DONE): hero (assets/dagennacht/case-hero.jpg) plus slide-01/02 brandbook spreads and slide-03 identity-in-application, exported from the D&N Brandbook ENG deck. NOTE: its next-case link points to duellen-case-study.html; while Duellen is embargoed, temporarily point it to undergrunden-case-study.html and flip back after the reveal.
- 07 Duellen (Tentpole talent launch, PAGE DONE, EMBARGOED): hero plus slide-01 (full-bleed key visual), slide-02/03 fictional-pitch film stills, slide-04/05/06 trio (leaked-photo teaser, social/BTS, OOH), slide-07 full-bleed in-the-world. CRITICAL EMBARGO with dates: the Podimo partnership is announced publicly Aug 7 2026, but the show NAME (Duellen) is only revealed around Aug 27 2026 with the full campaign film and the account rename. Do NOT deploy this page or link its card before the name reveal (~Aug 27); verify the reveal happened before including it in any build. Studio reveal follows Sept 1. Video: hero film cutdown once revealed.
- 08 Undergrunden (Show 360, visual-first layout, PAGE DONE): hero (assets/undergrunden/case-hero.jpg) plus slide-01 (full-bleed key art, 2400px+), slide-02/03 stills from The Experiment, slide-04/05/06 trio (R-rated trailer asset, portrait series, social rollout), and the existing slide-12.jpg already in place. Video: The Experiment film (internally "Eksperimentet") is the centerpiece embed.

Legacy assets assumed present from the old build: assets/podimostudios_case-hero.jpg, assets/galatic_copy.webp, assets/undergrunden/slide-12.jpg.


## Pending inputs and open items (state as of Aug 2 2026)

- Third-party quotes requested from Iain (Podimo, creative x growth angle) and Karan Dang (Disney, Galaxy's Edge angle). When they arrive: 1-2 sentences each, placed distributed (Iain in the Summer case or About, Karan in the Galaxy's Edge case), never as a testimonial wall. Target 3-4 voices total; a talent quote (e.g. from the Sports or Duellen creators) would be the strongest possible add.
- Numbers still owed (Nicolai extracting before Aug 10 when Podimo access ends): Summer campaign results for its placeholder stat lockups (or hide the section), any Undergrunden launch figure, and the proper award name + year behind the Studios "CC Shortlist".
- Asset exports per the content maps above (~40 images at 2x, curate hard: fewer exceptional beats more good) and video source files for cutdowns (Summer TOF/MOF films, Sports spots, The Experiment, Duellen hero film post-reveal).
- Resume: swap the site's download to Nicolai_Galal_Resume.pdf once Nicolai provides the current file.
- The About section's leadership paragraph is DONE (people + systems, test-and-learn loop, five-question learning cycle). Do not add further leadership copy without asking.
- Optional but recommended adds, ask Nicolai before building: a compact "Selected archive" strip on the homepage (Now More Than Ever 2019, Reflect 2023, Lyt Bedre 2024, no full case pages) to counter the mostly-one-company read; and a 60-90 second homepage showreel cut from the same footage as the case videos.
- Performance bar for launch: lazy loading, compressed video, image weight budget, flawless mobile. The site's engineering is part of the design credential for the FAANG-level audience.
- Outside the repo (Nicolai's own list): submit the YouTube Creative Studio EMEA application, align LinkedIn to the site's positioning, Google CV variant to be drafted in chat once the resume arrives.
