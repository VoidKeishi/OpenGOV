# AI-guided public service procedures

## The Problem

When a citizen needs to complete an administrative procedure such as a building permit, household registration, or birth certificate, they face three frustrating obstacles. First, they do not know what to prepare, including which documents, forms, or which office to visit. Second, they do not know whether they have filled things in correctly, since they only discover mistakes after an official reviews their application. Third, support bottlenecks mean too many questions and too few officials, so citizens must make repeated trips in person.

## What We Need to Build

Create an AI solution with three capabilities.

- The first capability is guided intake. The user describes their need in plain language. The AI asks clarifying questions and provides a specific document list along with a step-by-step process, complete with examples to illustrate each step.
- The second capability is pre-submission checking. The user enters what they have filled in, and the AI identifies common errors, missing fields, and data conflicts, then suggests fixes before anything gets submitted.
- The third capability is seamless integration. The solution must embed directly into existing public-service portals through an API, widget, or chatbot, so citizens need not install a new application.

## What We Need to Deliver

A working live demo accessible via a public URL, not a mockup. The minimum user flow should cover entering a need, receiving step-by-step guidance, and checking filled-in information. We also need architecture documentation including a system diagram and details on models and APIs used. Finally, we need a one-page summary covering the problem, the solution, target users, and a deployment roadmap. The data should come from public administrative-procedure sources including the National Public Service Portal (dichvucong.gov.vn) and the catalog of administrative forms organized by sector.

## How We Will Be Judged

The evaluation will focus on four areas:

- Accuracy and completeness of guidance compared to current regulations.
- The ability to detect errors and omissions in the user's filled-in application.
- Feasibility of integration into existing public-service systems, with a concrete pilot roadmap.
- And the overall user experience for non-technical citizens.
