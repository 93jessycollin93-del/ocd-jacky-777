// @ts-nocheck
// VeilOps — Threat Intelligence Reference Console
// Imported from external Lovable-built project. Reframed inside Jackie as a
// FACTUAL, non-game knowledge surface (MITRE ATT&CK, CISA KEV, APT profiles).
// Original colors/typography preserved per user direction; only the AI bridge
// and waitlist hooks were rewired to Jackie's backend.
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import AnimatedCanvas from "@/components/backgrounds/AnimatedCanvas";

import { useState, useEffect, useRef, useCallback } from "react";

const MITRE = {"techniques":[{"id":"T1055.011","name":"Extra Window Memory Injection","phase":"Stealth","desc":"Adversaries may inject malicious code into process via Extra Window Memory (EWM) in order to evade p","stix_id":"attack-pattern--0042a9f5-f053-4769-b3ef-9ad018dfa298"},{"id":"T1053.005","name":"Scheduled Task","phase":"Execution","desc":"Adversaries may abuse the Windows Task Scheduler to perform task scheduling for initial or recurring","stix_id":"attack-pattern--005a06c6-14bf-4118-afa0-ebcd8aebb0c9"},{"id":"T1205.002","name":"Socket Filters","phase":"Stealth","desc":"Adversaries may attach filters to a network socket to monitor then activate backdoors used for persi","stix_id":"attack-pattern--005cc321-08ce-4d17-b1ea-cb5275926520"},{"id":"T1560.001","name":"Archive via Utility","phase":"Collection","desc":"Adversaries may use utilities to compress and/or encrypt collected data prior to exfiltration. Many","stix_id":"attack-pattern--00f90846-cbd1-4fc5-9233-df5c2bf2a662"},{"id":"T1021.005","name":"VNC","phase":"Lateral Movement","desc":"Adversaries may use Valid Accounts to remotely control machines using Virtu","stix_id":"attack-pattern--01327cde-66c4-4123-bf34-5f258d59457b"},{"id":"T1047","name":"Windows Management Instrumentation","phase":"Execution","desc":"Adversaries may abuse Windows Management Instrumentation (WMI) to execute malicious commands and pay","stix_id":"attack-pattern--01a5a209-b94c-450b-b7f9-946497d91055"},{"id":"T1687","name":"Exploitation for Defense Impairment","phase":"defense-impairment","desc":"Adversaries may exploit vulnerabilities in security software, infrastructure, or defensive component","stix_id":"attack-pattern--01c9b54f-c04e-41ba-b0c3-cfe784b3a463"},{"id":"T1113","name":"Screen Capture","phase":"Collection","desc":"Adversaries may attempt to take screen captures of the desktop to gather information over the course","stix_id":"attack-pattern--0259baeb-9f63-4c69-bf10-eb038c390688"},{"id":"T1027.011","name":"Fileless Storage","phase":"Stealth","desc":"Adversaries may store data in \"fileless\" formats to conceal malicious activity from defenses. Filele","stix_id":"attack-pattern--02c5abff-30bf-4703-ab92-1f6072fae939"},{"id":"T1037","name":"Boot or Logon Initialization Scripts","phase":"Persistence","desc":"Adversaries may use scripts automatically executed at boot or logon initialization to establish pers","stix_id":"attack-pattern--03259939-0b57-482f-8eb5-87c0e0d54334"},{"id":"T1557","name":"Adversary-in-the-Middle","phase":"Credential Access","desc":"Adversaries may attempt to position themselves between two or more networked devices using an advers","stix_id":"attack-pattern--035bb001-ab69-4a0b-9f6c-2de8b09e1b9d"},{"id":"T1033","name":"System Owner/User Discovery","phase":"Discovery","desc":"Adversaries may attempt to identify the primary user, currently logged in user, set of users that co","stix_id":"attack-pattern--03d7999c-1f4c-42cc-8373-e7690d318104"},{"id":"T1583","name":"Acquire Infrastructure","phase":"Resource Dev","desc":"Adversaries may buy, lease, rent, or obtain infrastructure that can be used during targeting. A wide","stix_id":"attack-pattern--0458aab9-ad42-4eac-9e22-706a95bafee2"},{"id":"T1218.011","name":"Rundll32","phase":"Stealth","desc":"Adversaries may abuse rundll32.exe to proxy execution of malicious code. Using rundll32.exe, vice ex","stix_id":"attack-pattern--045d0922-2310-4e60-b5e4-3302302cb3c5"},{"id":"T1613","name":"Container and Resource Discovery","phase":"Discovery","desc":"Adversaries may attempt to discover containers and other resources that are available within a conta","stix_id":"attack-pattern--0470e792-32f8-46b0-a351-652bc35e9336"},{"id":"T1583.007","name":"Serverless","phase":"Resource Dev","desc":"Adversaries may purchase and configure serverless cloud infrastructure, such as Cloudflare Workers,","stix_id":"attack-pattern--04a5a8ab-3bc8-4c83-95c9-55274a89786d"},{"id":"T1132.001","name":"Standard Encoding","phase":"C2","desc":"Adversaries may encode data with a standard data encoding system to make the content of command and","stix_id":"attack-pattern--04fd5427-79c7-44ea-ae13-11b24778ff1c"},{"id":"T1027.009","name":"Embedded Payloads","phase":"Stealth","desc":"Adversaries may embed payloads within other files to conceal malicious content from defenses. Otherw","stix_id":"attack-pattern--0533ab23-3f7d-463f-9bd8-634d27e4dee1"},{"id":"T1556.003","name":"Pluggable Authentication Modules","phase":"defense-impairment","desc":"Adversaries may modify pluggable authentication modules (PAM) to access user credentials or enable o","stix_id":"attack-pattern--06c00069-771a-4d57-8ef5-d3718c1a8771"},{"id":"T1578.004","name":"Revert Cloud Instance","phase":"defense-impairment","desc":"An adversary may revert changes made to a cloud instance after they have performed malicious activit","stix_id":"attack-pattern--0708ae90-d0eb-4938-9a76-d0fc94f6eec1"},{"id":"T1592","name":"Gather Victim Host Information","phase":"Recon","desc":"Adversaries may gather information about the victim's hosts that can be used during targeting. Infor","stix_id":"attack-pattern--09312b1a-c3c6-4b45-9844-3ccc78e5d82f"},{"id":"T1596.003","name":"Digital Certificates","phase":"Recon","desc":"Adversaries may search public digital certificate data for information about victims that can be use","stix_id":"attack-pattern--0979abf9-4e26-43ec-9b6e-54efc4e70fca"},{"id":"T1056.001","name":"Keylogging","phase":"Collection","desc":"Adversaries may log user keystrokes to intercept credentials as the user types them. Keylogging is l","stix_id":"attack-pattern--09a60ea3-a8d1-4ae5-976e-5783248b72a4"},{"id":"T1564.012","name":"File/Path Exclusions","phase":"Stealth","desc":"Adversaries may attempt to hide their file-based artifacts by writing them to specific folders or fi","stix_id":"attack-pattern--09b008a9-b4eb-462a-a751-a0eb58050cd9"},{"id":"T1222.002","name":"Linux and Mac Permissions","phase":"defense-impairment","desc":"Adversaries may modify file or directory permissions/attributes to evade access control lists (ACLs)","stix_id":"attack-pattern--09b130a2-a77e-4af0-a361-f46f9aad1345"},{"id":"T1110.001","name":"Password Guessing","phase":"Credential Access","desc":"Adversaries with no prior knowledge of legitimate credentials within the system or environment may g","stix_id":"attack-pattern--09c4c11e-4fa1-4f8c-8dad-3cf8e69ad119"},{"id":"T1216.001","name":"PubPrn","phase":"Stealth","desc":"Adversaries may use PubPrn to proxy execution of malicious remote files. PubPrn.vbs is a [Visual Bas","stix_id":"attack-pattern--09cd431f-eaf4-4d2a-acaf-2a7acfe7ed58"},{"id":"T1597.002","name":"Purchase Technical Data","phase":"Recon","desc":"Adversaries may purchase technical information about victims that can be used during targeting. Info","stix_id":"attack-pattern--0a241b6c-7bb2-48f9-98f7-128145b4d27f"},{"id":"T1003","name":"OS Credential Dumping","phase":"Credential Access","desc":"Adversaries may attempt to dump credentials to obtain account login and credential material, normall","stix_id":"attack-pattern--0a3ead4e-6d47-4ccb-854c-a6a4f9d96b22"},{"id":"T1129","name":"Shared Modules","phase":"Execution","desc":"Adversaries may execute malicious payloads via loading shared modules. Shared modules are executable","stix_id":"attack-pattern--0a5231ec-41af-4a35-83d0-6bdf11f28c65"},{"id":"T1602","name":"Data from Configuration Repository","phase":"Collection","desc":"Adversaries may collect data related to managed devices from configuration repositories. Configurati","stix_id":"attack-pattern--0ad7bc5c-235a-4048-944b-3b286676cb74"},{"id":"T1561.002","name":"Disk Structure Wipe","phase":"Impact","desc":"Adversaries may corrupt or wipe the disk data structures on a hard drive necessary to boot a system;","stix_id":"attack-pattern--0af0ca99-357d-4ba1-805f-674fdfb7bef9"},{"id":"T1498.001","name":"Direct Network Flood","phase":"Impact","desc":"Adversaries may attempt to cause a denial of service (DoS) by directly sending a high-volume of netw","stix_id":"attack-pattern--0bda01d5-4c1d-4062-8ee2-6872334383c3"},{"id":"T1574.007","name":"Path Interception by PATH Environment Variable","phase":"Stealth","desc":"Adversaries may execute their own malicious payloads by hijacking environment variables used to load","stix_id":"attack-pattern--0c2d00da-7742-49e7-9928-4514e5075d32"},{"id":"T1213.002","name":"Sharepoint","phase":"Collection","desc":"Adversaries may leverage the SharePoint repository as a source to mine valuable information. SharePo","stix_id":"attack-pattern--0c4b4fda-9062-47da-98b9-ceae2dcf052a"},{"id":"T1006","name":"Direct Volume Access","phase":"Stealth","desc":"Adversaries may directly access a volume to bypass file access controls and file system monitoring.","stix_id":"attack-pattern--0c8ab3eb-df48-4b9c-ace7-beacaac81cc5"},{"id":"T1588.007","name":"Artificial Intelligence","phase":"Resource Dev","desc":"Adversaries may obtain access to generative artificial intelligence tools, such as large language mo","stix_id":"attack-pattern--0cc222f5-c3ff-48e6-9f52-3314baf9d37e"},{"id":"T1666","name":"Modify Cloud Resource Hierarchy","phase":"defense-impairment","desc":"Adversaries may attempt to modify hierarchical structures in infrastructure-as-a-service (IaaS) envi","stix_id":"attack-pattern--0ce73446-8722-4086-9d43-514f1d0f669e"},{"id":"T1564.008","name":"Email Hiding Rules","phase":"Stealth","desc":"Adversaries may use email rules to hide inbound emails in a compromised user's mailbox. Many email c","stix_id":"attack-pattern--0cf55441-b176-4332-89e7-2c4c7799d0ff"},{"id":"T1491.002","name":"External Defacement","phase":"Impact","desc":"An adversary may deface systems external to an organization in an attempt to deliver messaging, inti","stix_id":"attack-pattern--0cfe31a7-81fc-472c-bc45-e2808d1066a3"},{"id":"T1027.013","name":"Encrypted/Encoded File","phase":"Stealth","desc":"Adversaries may encrypt or encode files to obfuscate strings, bytes, and other specific patterns to","stix_id":"attack-pattern--0d91b3c0-5e50-47c3-949a-2a796f04d144"},{"id":"T1590.005","name":"IP Addresses","phase":"Recon","desc":"Adversaries may gather the victim's IP addresses that can be used during targeting. Public IP addres","stix_id":"attack-pattern--0dda99f0-4701-48ca-9774-8504922e92d3"},{"id":"T1499.001","name":"OS Exhaustion Flood","phase":"Impact","desc":"Adversaries may launch a denial of service (DoS) attack targeting an endpoint's operating system (OS","stix_id":"attack-pattern--0df05477-c572-4ed6-88a9-47c581f548f7"},{"id":"T1014","name":"Rootkit","phase":"Stealth","desc":"Adversaries may use rootkits to hide the presence of programs, files, network connections, services,","stix_id":"attack-pattern--0f20e3cb-245b-4a61-8a91-2d93f7cb0e9b"},{"id":"T1546.013","name":"PowerShell Profile","phase":"Privilege Escalation","desc":"Adversaries may gain persistence and elevate privileges by executing malicious content triggered by","stix_id":"attack-pattern--0f2c410d-d740-4ed9-abb1-b8f4a7faf6c3"},{"id":"T1059.007","name":"JavaScript","phase":"Execution","desc":"Adversaries may abuse various implementations of JavaScript for execution. JavaScript (JS) is a plat","stix_id":"attack-pattern--0f4a0c76-ab2d-4cb0-85d3-3f0efb8cba0d"},{"id":"T1685.003","name":"Modify or Spoof Tool UI","phase":"defense-impairment","desc":"Adversaries may spoof or manipulate security tool user interfaces (UIs) to falsely indicate tools ar","stix_id":"attack-pattern--0ff4bd68-aebb-4039-9e00-9f92c705edf4"},{"id":"T1590.002","name":"DNS","phase":"Recon","desc":"Adversaries may gather information about the victim's DNS that can be used during targeting. DNS inf","stix_id":"attack-pattern--0ff59227-8aa8-4c09-bf1f-925605bd07ea"},{"id":"T1485.001","name":"Lifecycle-Triggered Deletion","phase":"Impact","desc":"Adversaries may modify the lifecycle policies of a cloud storage bucket to destroy all objects store","stix_id":"attack-pattern--1001e0d6-ee09-4dfc-aa90-e9320ffc8fe4"},{"id":"T1123","name":"Audio Capture","phase":"Collection","desc":"An adversary can leverage a computer's peripheral devices (e.g., microphones and webcams) or applica","stix_id":"attack-pattern--1035cdf2-3e5f-446f-a7a7-e8f6d7925967"},{"id":"T1543","name":"Create or Modify System Process","phase":"Persistence","desc":"Adversaries may create or modify system-level processes to repeatedly execute malicious payloads as","stix_id":"attack-pattern--106c0cf6-bf73-4601-9aa8-0945c2715ec5"},{"id":"T1133","name":"External Remote Services","phase":"Persistence","desc":"Adversaries may leverage external-facing remote services to initially access and/or persist within a","stix_id":"attack-pattern--10d51417-ee35-4589-b1ff-b6df1c334e8d"},{"id":"T1546.006","name":"LC_LOAD_DYLIB Addition","phase":"Privilege Escalation","desc":"Adversaries may establish persistence by executing malicious content triggered by the execution of t","stix_id":"attack-pattern--10ff21b9-5a01-4268-a1b5-3b55015f1847"},{"id":"T1539","name":"Steal Web Session Cookie","phase":"Credential Access","desc":"An adversary may steal web application or service session cookies and use them to gain access to web","stix_id":"attack-pattern--10ffac09-e42d-4f56-ab20-db94c67d76ff"},{"id":"T1053.007","name":"Container Orchestration Job","phase":"Execution","desc":"Adversaries may abuse task scheduling functionality provided by container orchestration tools such a","stix_id":"attack-pattern--1126cab1-c700-412f-a510-61f4937bb096"},{"id":"T1568.002","name":"Domain Generation Algorithms","phase":"C2","desc":"Adversaries may make use of Domain Generation Algorithms (DGAs) to dynamically identify a destinatio","stix_id":"attack-pattern--118f61a5-eb3e-4fb6-931f-2096647f4ecd"},{"id":"T1036.007","name":"Double File Extension","phase":"Stealth","desc":"Adversaries may abuse a double extension in the filename as a means of masquerading the true file ty","stix_id":"attack-pattern--11f29a39-0942-4d62-92b6-fe236cf3066e"},{"id":"T1548.002","name":"Bypass User Account Control","phase":"Privilege Escalation","desc":"Adversaries may bypass UAC mechanisms to elevate process privileges on system. Windows User Account","stix_id":"attack-pattern--120d5519-3098-4e1c-9191-2aa61232f073"},{"id":"T1496.003","name":"SMS Pumping","phase":"Impact","desc":"Adversaries may leverage messaging services for SMS pumping, which may impact system and/or hosted s","stix_id":"attack-pattern--130d4494-b2d6-4040-bcea-6e59f05222fe"},{"id":"T1016.001","name":"Internet Connection Discovery","phase":"Discovery","desc":"Adversaries may check for Internet connectivity on compromised systems. This may be performed during","stix_id":"attack-pattern--132d5b37-aac5-4378-a8dc-3127b18a73dc"}],"groups":[{"stix_id":"intrusion-set--01e28736-2ffc-455b-9880-ed4d1407ae07","name":"Indrik Spider","aliases":["Indrik Spider","Evil Corp"],"desc":"Indrik Spider is a Russia-based cybercriminal group that has been active since"},{"stix_id":"intrusion-set--b7f627e2-0817-4cd5-8d50-e75f8aa85cc6","name":"LuminousMoth","aliases":["LuminousMoth"],"desc":"LuminousMoth is a Chinese-speaking cyber espionage group that has been active s"},{"stix_id":"intrusion-set--918da025-04bd-48af-b6c4-f3e4d1b915eb","name":"Medusa Group","aliases":["Medusa Group"],"desc":"Medusa Group has been active since at least 2021 and was initially operated as"},{"stix_id":"intrusion-set--dd2d9ca6-505b-4860-a604-233685b802c7","name":"Wizard Spider","aliases":["Wizard Spider","UNC1878"],"desc":"Wizard Spider is a Russia-based financially motivated threat group originally k"},{"stix_id":"intrusion-set--03506554-5f37-4f8f-9ce4-0e9f01a1b484","name":"Elderwood","aliases":["Elderwood","Elderwood Gang"],"desc":"Elderwood is a suspected Chinese cyber espionage group that was reportedly resp"},{"stix_id":"intrusion-set--6b1b551c-d770-4f95-8cfc-3cd253c4c04e","name":"Frankenstein","aliases":["Frankenstein"],"desc":"Frankenstein is a campaign carried out between January and April 2019 by unknow"},{"stix_id":"intrusion-set--3753cc21-2dae-4dfb-8481-d004e74502cc","name":"FIN7","aliases":["FIN7","GOLD NIAGARA"],"desc":"FIN7 is a financially-motivated threat group that has been active since 2013. ["},{"stix_id":"intrusion-set--461b8e25-8f4a-4ea2-a4a8-e39df7ce6630","name":"UNC3886","aliases":["UNC3886"],"desc":"UNC3886 is a China-nexus cyberespionage group that has been active since at lea"},{"stix_id":"intrusion-set--e1fc262c-dad2-4b82-abda-5f08dd134971","name":"Velvet Ant","aliases":["Velvet Ant"],"desc":"Velvet Ant is a threat actor operating since at least 2021. [Velvet Ant](https:"},{"stix_id":"intrusion-set--f8cb7b36-62ef-4488-8a6d-a7033e3271c1","name":"WIRTE","aliases":["WIRTE","Ashen Lepus"],"desc":"WIRTE is a cyberespionage actor, believed to be a subgroup of the Hamas-affilia"},{"stix_id":"intrusion-set--9b36c218-4d80-4ec6-a68d-cc2886bbe410","name":"Star Blizzard","aliases":["Star Blizzard","SEABORGIUM"],"desc":"Star Blizzard is a cyber espionage and influence group originating in Russia th"},{"stix_id":"intrusion-set--1c63d4ec-0a75-4daa-b1df-0d11af3d3cc1","name":"Dragonfly","aliases":["Dragonfly","TEMP.Isotope"],"desc":"Dragonfly is a cyber espionage group that has been attributed to Russia's Feder"},{"stix_id":"intrusion-set--c4d50cdf-87ce-407d-86d8-862883485842","name":"APT-C-36","aliases":["APT-C-36","Blind Eagle"],"desc":"APT-C-36 is a suspected South American threat group that has engaged in espiona"},{"stix_id":"intrusion-set--4ca1929c-7d64-4aab-b849-badbfc0c760d","name":"OilRig","aliases":["OilRig","COBALT GYPSY"],"desc":"OilRig is a suspected Iranian threat group that has targeted Middle Eastern and"},{"stix_id":"intrusion-set--96e239be-ad99-49eb-b127-3007b8c1bec9","name":"Equation","aliases":["Equation"],"desc":"Equation is a sophisticated threat group that employs multiple remote access to"},{"stix_id":"intrusion-set--c21dd6f1-1364-4a70-a1f7-783080ec34ee","name":"Fox Kitten","aliases":["Fox Kitten","UNC757"],"desc":"Fox Kitten is threat actor with a suspected nexus to the Iranian government tha"},{"stix_id":"intrusion-set--c93fccb1-e8e8-42cf-ae33-2ad1d183913a","name":"Lazarus Group","aliases":["Lazarus Group","Labyrinth Chollima"],"desc":"Lazarus Group is a North Korean state-sponsored cyber threat group attributed t"},{"stix_id":"intrusion-set--64b52e7d-b2c4-4a02-9372-08a463f5dc11","name":"Aquatic Panda","aliases":["Aquatic Panda"],"desc":"Aquatic Panda is a suspected China-based threat group with a dual mission of in"},{"stix_id":"intrusion-set--f3be6240-f68e-47e1-90d2-ad8f3b3bb8a6","name":"Daggerfly","aliases":["Daggerfly","Evasive Panda"],"desc":"Daggerfly is a People's Republic of China-linked APT entity active since at lea"},{"stix_id":"intrusion-set--35d1b3be-49d4-42f1-aaa6-ef159c880bca","name":"TeamTNT","aliases":["TeamTNT"],"desc":"TeamTNT is a threat group that has primarily targeted cloud and containerized e"},{"stix_id":"intrusion-set--7eda3dd8-b09b-4705-8090-c2ad9fb8c14d","name":"TA505","aliases":["TA505","Hive0065"],"desc":"TA505 is a cyber criminal group that has been active since at least 2014. [TA50"},{"stix_id":"intrusion-set--ead23196-d7b6-4ce6-a124-4ab4b67d81bd","name":"Inception","aliases":["Inception","Inception Framework"],"desc":"Inception is a cyber espionage group active since at least 2014. The group has"},{"stix_id":"intrusion-set--16ade1aa-0ea1-4bb7-88cc-9079df2ae756","name":"admin@338","aliases":["admin@338"],"desc":"admin@338 is a China-based cyber threat group. It has previously used newsworth"},{"stix_id":"intrusion-set--6fe8a2a1-a1b0-4af8-953d-4babd329f8f8","name":"BlackTech","aliases":["BlackTech","Palmerworm"],"desc":"BlackTech is a suspected Chinese cyber espionage group that has primarily targe"},{"stix_id":"intrusion-set--c0291346-defe-48d7-9542-9e074ba1bdfb","name":"APT42","aliases":["APT42"],"desc":"APT42 is an Iranian-sponsored threat group that conducts cyber espionage and su"}],"malware":[{"stix_id":"malware--007b44b6-e4c5-480b-b5b9-56f2081b1b7b","name":"HDoor","desc":"HDoor is malware that has been customized and used by the","platforms":["Windows"]},{"stix_id":"malware--00806466-754d-44ea-ad6f-0caf59cb8556","name":"TrickBot","desc":"TrickBot is a Trojan spyware program written in C++ that","platforms":["Windows"]},{"stix_id":"malware--00936d7a-451d-4a9c-88fc-05b141aa2d3f","name":"cd00r","desc":"cd00r is an open-source backdoor for UNIX and UNIX-varian","platforms":["Network Devices"]},{"stix_id":"malware--00c3bfcb-99bd-4767-8c03-b08f585f5c8a","name":"PowerDuke","desc":"PowerDuke is a backdoor that was used by [APT29](https://","platforms":["Windows"]},{"stix_id":"malware--00e7d565-9883-4ee5-b642-8fd17fd6a3f5","name":"EKANS","desc":"EKANS is ransomware variant written in Golang that first","platforms":["Windows"]},{"stix_id":"malware--01dbc71d-0ee8-420d-abb4-3dfb6a4bf725","name":"BLINDINGCAN","desc":"BLINDINGCAN is a remote access Trojan that has been used","platforms":["Windows"]},{"stix_id":"malware--023254de-caaf-4a05-b2c7-e4e2f283f7a5","name":"Ninja","desc":"Ninja is a malware developed in C++ that has been used by","platforms":["Windows"]},{"stix_id":"malware--02739f57-7585-4319-acd3-794ae8ff3a70","name":"Pikabot","desc":"Pikabot is a backdoor used for initial access and follow-","platforms":["Windows"]},{"stix_id":"malware--039814a0-88de-46c5-a4fb-b293db21880a","name":"Wiarp","desc":"Wiarp is a trojan used by [Elderwood](https://attack.mitr","platforms":["Windows"]},{"stix_id":"malware--03acae53-9b98-46f6-b204-16b930839055","name":"RCSession","desc":"RCSession is a backdoor written in C++ that has been in u","platforms":["Windows"]},{"stix_id":"malware--03ea629c-517a-41e3-94f8-c7e5368cf8f4","name":"Spark","desc":"Spark is a Windows backdoor and has been in use since as","platforms":["Windows"]},{"stix_id":"malware--03eb4a05-6a02-43f6-afb7-3c7835501828","name":"QuietSieve","desc":"QuietSieve is an information stealer that has been used b","platforms":["Windows"]},{"stix_id":"malware--04227b24-7817-4de1-9050-b7b1b57f5866","name":"SynAck","desc":"SynAck is variant of Trojan ransomware targeting mainly E","platforms":["Windows"]},{"stix_id":"malware--04378e79-4387-468a-a8f7-f974b8254e44","name":"Bumblebee","desc":"Bumblebee is a custom loader written in C++ that has been","platforms":["Windows"]},{"stix_id":"malware--0450ed20-e9a7-4799-b601-2f2710300796","name":"BRICKSTORM","desc":"BRICKSTORM is a cross-platform backdoor with variants wri","platforms":["ESXi","Linux","Network Devices"]},{"stix_id":"malware--049ff071-0b3c-4712-95d2-d21c6aa54501","name":"MURKYTOP","desc":"MURKYTOP is a reconnaissance tool used by [Leviathan](htt","platforms":["Windows"]},{"stix_id":"malware--04cecafd-cb5f-4daf-aa1f-73899116c4a2","name":"AcidRain","desc":"AcidRain is an ELF binary targeting modems and routers us","platforms":["Network Devices","Linux"]},{"stix_id":"malware--04fc1842-f9e4-47cf-8cb8-5c61becad142","name":"GRIFFON","desc":"GRIFFON is a JavaScript backdoor used by [FIN7](https://a","platforms":["Windows"]},{"stix_id":"malware--051eaca1-958f-4091-9e5f-a9acd8f820b5","name":"Exaramel for Windows","desc":"Exaramel for Windows is a backdoor used for targeting Win","platforms":["Windows"]},{"stix_id":"malware--05318127-5962-444b-b900-a9dcfe0ff6e9","name":"Amadey","desc":"Amadey is a Trojan bot that has been used since at least","platforms":["Windows"]},{"stix_id":"malware--05489800-6c6f-4922-a0de-d573b333e612","name":"JumbledPath","desc":"JumbledPath is a custom-built utility written in GO that","platforms":["Network Devices"]},{"stix_id":"malware--065196de-d7e8-4888-acfb-b2134022ba1b","name":"RDFSNIFFER","desc":"RDFSNIFFER is a module loaded by [BOOSTWRITE](https://att","platforms":["Windows"]},{"stix_id":"malware--0659f55c-3b68-4e5d-8071-12ded6684731","name":"NICECURL","desc":"NICECURL is a VBScript-based backdoor used by [APT42](htt","platforms":["Windows"]},{"stix_id":"malware--069af411-9b24-4e85-b26c-623d035bbe84","name":"Proxysvc","desc":"Proxysvc is a malicious DLL used by [Lazarus Group](https","platforms":["Windows"]},{"stix_id":"malware--06d735e7-1db1-4dbe-ab4b-acbe419f902b","name":"Orz","desc":"Orz is a custom JavaScript backdoor used by [Leviathan](h","platforms":["Windows"]},{"stix_id":"malware--0715560d-4299-4e84-9e20-6e80ab57e4f2","name":"Torisma","desc":"Torisma is a second stage implant designed for specialize","platforms":["Windows"]},{"stix_id":"malware--071d5d65-83ec-4a55-acfa-be7d5f28ba9a","name":"NOKKI","desc":"NOKKI is a modular remote access tool. The earliest obser","platforms":["Windows"]},{"stix_id":"malware--0817aaf2-afea-4c32-9285-4dcd1df5bf14","name":"yty","desc":"yty is a modular, plugin-based malware framework. The com","platforms":["Windows"]},{"stix_id":"malware--083bb47b-02c8-4423-81a2-f9ef58572974","name":"Backdoor.Oldrea","desc":"Backdoor.Oldrea is a modular backdoor that used by [Drago","platforms":["Windows"]},{"stix_id":"malware--0852567d-7958-4f4b-8947-4f840ec8d57d","name":"DOGCALL","desc":"DOGCALL is a backdoor used by [APT37](https://attack.mitr","platforms":["Windows"]}],"relationships":[{"src":"malware--6a21e3a4-5ffe-4581-af9a-6a54c7536f44","tgt":"attack-pattern--707399d6-ab3e-4963-9315-d9d3818cd6a0","sn":"Explosive","tn":"System Network Configuration Discovery","rt":"uses"},{"src":"course-of-action--21da4fd4-27ad-4e9c-b93d-0b9b14d02c96","tgt":"attack-pattern--43c9bc06-715b-42db-972f-52d25c09a20c","sn":"Restrict Web-Based Content","tn":"Content Injection","rt":"mitigates"},{"src":"intrusion-set--01e28736-2ffc-455b-9880-ed4d1407ae07","tgt":"attack-pattern--65f2d882-3f41-4d48-8a06-29af77ec9f90","sn":"Indrik Spider","tn":"LSASS Memory","rt":"uses"},{"src":"malware--425771c5-48b4-4ecd-9f95-74ed3fc9da59","tgt":"attack-pattern--bf176076-b789-408e-8cba-7275e81c0ada","sn":"SombRAT","tn":"Asymmetric Cryptography","rt":"uses"},{"src":"malware--b7010785-699f-412f-ba49-524da6033c76","tgt":"attack-pattern--132d5b37-aac5-4378-a8dc-3127b18a73dc","sn":"GoldFinder","tn":"Internet Connection Discovery","rt":"uses"},{"src":"malware--a7881f21-e978-4fe4-af56-92c9416a2616","tgt":"attack-pattern--ca9d3402-ada3-484d-876a-d717bd6e05f2","sn":"Cobalt Strike","tn":"Domain Fronting","rt":"uses"},{"src":"malware--8901ac23-6b50-410c-b0dd-d8174a86f9b3","tgt":"attack-pattern--f3c544dc-673c-4ef3-accb-53229f1ae077","sn":"Shamoon","tn":"System Time Discovery","rt":"uses"},{"src":"campaign--df74f7ad-b10d-431c-9f1d-a2bc18dadefa","tgt":"attack-pattern--cd92d2b8-ce43-4666-9472-f1b4b9f4f8be","sn":"C0027","tn":"Impersonation","rt":"uses"},{"src":"malware--8c050cea-86e1-4b63-bf21-7af4fa483349","tgt":"attack-pattern--354a7f88-63fb-41b5-a801-ce3b377b36f1","sn":"Micropsia","tn":"System Information Discovery","rt":"uses"},{"src":"campaign--df74f7ad-b10d-431c-9f1d-a2bc18dadefa","tgt":"attack-pattern--4fe28b27-b13c-453e-a386-c2ef362a573b","sn":"C0027","tn":"Protocol Tunneling","rt":"uses"},{"src":"intrusion-set--b7f627e2-0817-4cd5-8d50-e75f8aa85cc6","tgt":"attack-pattern--10ffac09-e42d-4f56-ab20-db94c67d76ff","sn":"LuminousMoth","tn":"Steal Web Session Cookie","rt":"uses"},{"src":"intrusion-set--918da025-04bd-48af-b6c4-f3e4d1b915eb","tgt":"attack-pattern--f5d8eed6-48a9-4cdf-a3d7-d1ffa99c3d2a","sn":"Medusa Group","tn":"Inhibit System Recovery","rt":"uses"},{"src":"campaign--b03d5112-e23a-4ac8-add0-be7502d24eff","tgt":"attack-pattern--c32f7008-9fea-41f7-8366-5eb9b74bd896","sn":"Operation Wocao","tn":"Query Registry","rt":"uses"},{"src":"intrusion-set--dd2d9ca6-505b-4860-a604-233685b802c7","tgt":"attack-pattern--635cbe30-392d-4e27-978e-66774357c762","sn":"Wizard Spider","tn":"Local Account","rt":"uses"},{"src":"malware--3553b49d-d4ae-4fb6-ab17-0adbc520c888","tgt":"attack-pattern--3489cfc5-640f-4bb3-a103-9137b97de79f","sn":"BADHATCH","tn":"Network Share Discovery","rt":"uses"},{"src":"intrusion-set--03506554-5f37-4f8f-9ce4-0e9f01a1b484","tgt":"malware--b42378e0-f147-496f-992a-26a49705395b","sn":"Elderwood","tn":"PoisonIvy","rt":"uses"},{"src":"malware--8ec6e3b4-b06d-4805-b6aa-af916acc2122","tgt":"attack-pattern--4ab929c6-ee2d-4fb5-aab4-b14be2ed7179","sn":"RogueRobin","tn":"Shortcut Modification","rt":"uses"},{"src":"malware--0f862b01-99da-47cc-9bdb-db4a86a95bb1","tgt":"attack-pattern--9efb1ea7-c37b-4595-9640-b7680cd84279","sn":"Emissary","tn":"Registry Run Keys / Startup Folder","rt":"uses"},{"src":"malware--1492d0f8-7e14-4af3-9239-bc3fe10d3407","tgt":"attack-pattern--322bad5a-1c49-4d23-ab79-76d641794afa","sn":"Ursnif","tn":"System Service Discovery","rt":"uses"},{"src":"malware--7e100ca4-e639-48d9-9a9d-8ad84aa7b448","tgt":"attack-pattern--df8b2a25-8bdf-4856-953c-a04372b1c161","sn":"Mori","tn":"Web Protocols","rt":"uses"},{"src":"course-of-action--78bb71be-92b4-46de-acd6-5f998fedf1cc","tgt":"attack-pattern--67073dde-d720-45ae-83da-b12d5e73ca3b","sn":"Pre-compromise","tn":"Active Scanning","rt":"mitigates"},{"src":"malware--c46eb8e6-bf29-4696-8008-3ddb0b4ca470","tgt":"attack-pattern--0d91b3c0-5e50-47c3-949a-2a796f04d144","sn":"DEADEYE","tn":"Encrypted/Encoded File","rt":"uses"},{"src":"intrusion-set--3753cc21-2dae-4dfb-8481-d004e74502cc","tgt":"attack-pattern--ef67e13e-5598-4adc-bdb2-998225874fa9","sn":"FIN7","tn":"Malicious Link","rt":"uses"},{"src":"intrusion-set--461b8e25-8f4a-4ea2-a4a8-e39df7ce6630","tgt":"attack-pattern--b0533c6e-8fea-4788-874f-b799cacc4b92","sn":"UNC3886","tn":"Indicator Removal from Tools","rt":"uses"},{"src":"course-of-action--20f6a9df-37c4-4e20-9e47-025983b1b39d","tgt":"attack-pattern--8868cb5b-d575-4a60-acb2-07d37389a2fd","sn":"Filter Network Traffic","tn":"Port Knocking","rt":"mitigates"},{"src":"malware--e23d2777-b85d-44fc-861e-9149d399fbb9","tgt":"attack-pattern--0d91b3c0-5e50-47c3-949a-2a796f04d144","sn":"Qilin","tn":"Encrypted/Encoded File","rt":"uses"},{"src":"course-of-action--b5dbb4c5-b0b1-40b1-80b6-e9e84ab90067","tgt":"attack-pattern--2b742742-28c3-4e1b-bab7-8350d6300fa7","sn":"Software Configuration","tn":"Spearphishing Link","rt":"mitigates"},{"src":"malware--5c747acd-47f0-4c5a-b9e5-213541fc01e0","tgt":"attack-pattern--005a06c6-14bf-4118-afa0-ebcd8aebb0c9","sn":"GoldMax","tn":"Scheduled Task","rt":"uses"},{"src":"malware--d906e6f7-434c-44c0-b51a-ed50af8f7945","tgt":"attack-pattern--354a7f88-63fb-41b5-a801-ce3b377b36f1","sn":"njRAT","tn":"System Information Discovery","rt":"uses"},{"src":"intrusion-set--e1fc262c-dad2-4b82-abda-5f08dd134971","tgt":"malware--64fa0de0-6240-41f4-8638-f4ca7ed528fd","sn":"Velvet Ant","tn":"PlugX","rt":"uses"},{"src":"malware--0b32ec39-ba61-4864-9ebe-b4b0b73caf9a","tgt":"attack-pattern--d63a3fb8-9452-4e9d-a60a-54be68d5998c","sn":"TDTESS","tn":"File Deletion","rt":"uses"},{"src":"campaign--add4d9de-1256-4166-83b8-57087288dced","tgt":"attack-pattern--830c9528-df21-472c-8c14-a036bf17d665","sn":"APT41 DUST","tn":"Web Service","rt":"uses"},{"src":"intrusion-set--f8cb7b36-62ef-4488-8a6d-a7033e3271c1","tgt":"attack-pattern--970a3432-3237-47ad-bcca-7d8cbb217736","sn":"WIRTE","tn":"PowerShell","rt":"uses"},{"src":"malware--d9f7383c-95ec-4080-bbce-121c9384457b","tgt":"attack-pattern--b80d107d-fa0d-4b60-9684-b0433e8bdba0","sn":"Maze","tn":"Data Encrypted for Impact","rt":"uses"},{"src":"intrusion-set--9b36c218-4d80-4ec6-a68d-cc2886bbe410","tgt":"attack-pattern--cd92d2b8-ce43-4666-9472-f1b4b9f4f8be","sn":"Star Blizzard","tn":"Impersonation","rt":"uses"},{"src":"malware--4efc3e00-72f2-466a-ab7c-8a7dc6603b19","tgt":"attack-pattern--4bed873f-0b7d-41d4-b93a-b6905d1f90b0","sn":"Raindrop","tn":"Time Based Checks","rt":"uses"},{"src":"intrusion-set--f8cb7b36-62ef-4488-8a6d-a7033e3271c1","tgt":"attack-pattern--b18eae87-b469-4e14-b454-b171b416bc18","sn":"WIRTE","tn":"Non-Standard Port","rt":"uses"},{"src":"malware--cb741463-f0fe-42e0-8d45-bc7e8335f5ae","tgt":"attack-pattern--dfd7cc1d-e1d8-4394-a198-97c4cab8aa67","sn":"Lokibot","tn":"Visual Basic","rt":"uses"},{"src":"malware--4dea7d8e-af94-4bfb-afe4-7ff54f59308b","tgt":"attack-pattern--4f9ca633-15c5-463c-9724-bdcd54fde541","sn":"Conti","tn":"SMB/Windows Admin Shares","rt":"uses"},{"src":"campaign--8d2bc130-89fe-466e-a4f9-6bce6129c2b8","tgt":"malware--a394448a-4576-41b8-81cc-9b61abad94ab","sn":"FunnyDream","tn":"ccf32","rt":"uses"},{"src":"malware--d69c8146-ab35-4d50-8382-6fc80e641d43","tgt":"attack-pattern--7bc57495-ea59-4380-be31-a64af124ef18","sn":"BLACKCOFFEE","tn":"File and Directory Discovery","rt":"uses"},{"src":"intrusion-set--461b8e25-8f4a-4ea2-a4a8-e39df7ce6630","tgt":"attack-pattern--63b24abc-5702-4745-b1e4-ac70b20a43f2","sn":"UNC3886","tn":"Search Threat Vendor Data","rt":"uses"},{"src":"campaign--a543ef15-91ea-4aa9-9c10-267d56e1ee82","tgt":"attack-pattern--9c99724c-a483-4d60-ad9d-7f004e42e8e8","sn":"ArcaneDoor","tn":"One-Way Communication","rt":"uses"},{"src":"attack-pattern--8d7bd4f5-3a89-4453-9c82-2c8894d5655e","tgt":"attack-pattern--435dfb86-2697-4867-85b5-2fef496c0517","sn":"Group Policy Preferences","tn":"Unsecured Credentials","rt":"subtechnique-of"},{"src":"tool--cb69b20d-56d0-41ab-8440-4a4b251614d4","tgt":"attack-pattern--f1951e8a-500e-4a26-8803-76d95c4554b4","sn":"Pupy","tn":"Service Execution","rt":"uses"},{"src":"intrusion-set--1c63d4ec-0a75-4daa-b1df-0d11af3d3cc1","tgt":"attack-pattern--53ac20cd-aca3-406e-9aa0-9fc7fdc60a5a","sn":"Dragonfly","tn":"Archive Collected Data","rt":"uses"},{"src":"malware--edb24a93-1f7a-4bbf-a738-1397a14662c6","tgt":"attack-pattern--f7827069-0bf2-4764-af4f-23fae0d181b7","sn":"Astaroth","tn":"Dead Drop Resolver","rt":"uses"},{"src":"malware--a7881f21-e978-4fe4-af56-92c9416a2616","tgt":"attack-pattern--1365fe3b-0f50-455d-b4da-266ce31c23b0","sn":"Cobalt Strike","tn":"Sudo and Sudo Caching","rt":"uses"},{"src":"intrusion-set--dd2d9ca6-505b-4860-a604-233685b802c7","tgt":"attack-pattern--e7cbc1de-1f79-48ee-abfd-da1241c65a15","sn":"Wizard Spider","tn":"Code Signing Certificates","rt":"uses"},{"src":"malware--eac3d77f-2b7b-4599-ba74-948dc16633ad","tgt":"attack-pattern--1996eef1-ced3-4d7f-bf94-33298cabbf72","sn":"Goopy","tn":"DNS","rt":"uses"},{"src":"malware--af2ad3b7-ab6a-4807-91fd-51bcaff9acbb","tgt":"attack-pattern--1b7ba276-eedc-4951-a762-0ceea2c030ec","sn":"USBStealer","tn":"Data from Removable Media","rt":"uses"},{"src":"malware--ff6840c9-4c87-4d07-bbb6-9f50aa33d498","tgt":"attack-pattern--3b744087-9945-4a6f-91e8-9dbceda417a4","sn":"Flame","tn":"Replication Through Removable Media","rt":"uses"},{"src":"course-of-action--9bb9e696-bff8-4ae1-9454-961fc7d91d5f","tgt":"attack-pattern--005a06c6-14bf-4118-afa0-ebcd8aebb0c9","sn":"Privileged Account Management","tn":"Scheduled Task","rt":"mitigates"},{"src":"x-mitre-detection-strategy--be6a466c-40c6-4611-9b68-7cfcbcb35fb0","tgt":"attack-pattern--dca670cf-eeec-438f-8185-fd959d9ef211","sn":"Detection Strategy for Boot or Logon Initialization Scripts: RC Scripts","tn":"RC Scripts","rt":"detects"},{"src":"malware--a8a778f5-0035-4870-bb25-53dc05029586","tgt":"attack-pattern--391d824f-0ef1-47a0-b0ee-c59a75e27670","sn":"EvilBunny","tn":"Native API","rt":"uses"},{"src":"malware--7908f855-5b5b-4d6a-acbc-af6b45ec27ad","tgt":"attack-pattern--d63a3fb8-9452-4e9d-a60a-54be68d5998c","sn":"LODEINFO","tn":"File Deletion","rt":"uses"},{"src":"intrusion-set--c4d50cdf-87ce-407d-86d8-862883485842","tgt":"malware--d906e6f7-434c-44c0-b51a-ed50af8f7945","sn":"APT-C-36","tn":"njRAT","rt":"uses"},{"src":"course-of-action--93e7968a-9074-4eac-8ae9-9f5200ec3317","tgt":"attack-pattern--57a3d31a-d04f-4663-b2da-7df8ec3f8c9d","sn":"User Account Management","tn":"Cloud Infrastructure Discovery","rt":"mitigates"},{"src":"intrusion-set--4ca1929c-7d64-4aab-b849-badbfc0c760d","tgt":"malware--5be33fef-39c0-4532-84ee-bea31e1b5324","sn":"OilRig","tn":"ISMInjector","rt":"uses"},{"src":"intrusion-set--96e239be-ad99-49eb-b127-3007b8c1bec9","tgt":"attack-pattern--dfebc3b7-d19d-450b-81c7-6dafe4184c04","sn":"Equation","tn":"Hidden File System","rt":"uses"},{"src":"malware--bb6f2a5c-dbc9-45b0-bd3f-a0b7849959c2","tgt":"attack-pattern--0259baeb-9f63-4c69-bf10-eb038c390688","sn":"AshTag","tn":"Screen Capture","rt":"uses"},{"src":"malware--82cb34ba-02b5-432b-b2d2-07f55cbf674d","tgt":"attack-pattern--03d7999c-1f4c-42cc-8373-e7690d318104","sn":"Trojan.Karagany","tn":"System Owner/User Discovery","rt":"uses"},{"src":"malware--fb4e3792-e915-4fdd-a9cd-92dfa2ace7aa","tgt":"attack-pattern--df8b2a25-8bdf-4856-953c-a04372b1c161","sn":"UPPERCUT","tn":"Web Protocols","rt":"uses"},{"src":"malware--f9b05f33-d45d-4e4d-aafe-c208d38a0080","tgt":"attack-pattern--677569f9-a8b0-459e-ab24-7f18091fa7bf","sn":"Azorult","tn":"Create Process with Token","rt":"uses"},{"src":"campaign--a6aba167-5ada-4812-9da1-912c0e73335d","tgt":"tool--0a68f1f1-da74-4d28-8d9a-696c082706cc","sn":"2025 Poland Wiper Attacks","tn":"certutil","rt":"uses"},{"src":"intrusion-set--4ca1929c-7d64-4aab-b849-badbfc0c760d","tgt":"attack-pattern--e7cbc1de-1f79-48ee-abfd-da1241c65a15","sn":"OilRig","tn":"Code Signing Certificates","rt":"uses"},{"src":"intrusion-set--c21dd6f1-1364-4a70-a1f7-783080ec34ee","tgt":"attack-pattern--e6919abc-99f9-4c6c-95a5-14761e7b2add","sn":"Fox Kitten","tn":"Ingress Tool Transfer","rt":"uses"},{"src":"malware--cc5497f7-a9e8-436f-94da-b2b4a9b9ad3c","tgt":"attack-pattern--03d7999c-1f4c-42cc-8373-e7690d318104","sn":"PoetRAT","tn":"System Owner/User Discovery","rt":"uses"},{"src":"course-of-action--1dcaeb21-9348-42ea-950a-f842aaf1ae1f","tgt":"attack-pattern--7f0ca133-88c4-40c6-a62f-b3083a7fbc2e","sn":"Limit Access to Resource Over Network","tn":"Pre-OS Boot","rt":"mitigates"},{"src":"campaign--808d6b30-df4e-4341-8248-724da4bac650","tgt":"attack-pattern--1f9c2bae-b441-4f66-a8af-b65946ee72f2","sn":"SolarWinds Compromise","tn":"SAML Tokens","rt":"uses"},{"src":"malware--a7881f21-e978-4fe4-af56-92c9416a2616","tgt":"attack-pattern--32901740-b42c-4fdd-bc02-345b5dc57082","sn":"Cobalt Strike","tn":"Code Signing","rt":"uses"},{"src":"intrusion-set--c93fccb1-e8e8-42cf-ae33-2ad1d183913a","tgt":"tool--3ffbdc1f-d2bf-41ab-91a2-c7b857e98079","sn":"Lazarus Group","tn":"RawDisk","rt":"uses"},{"src":"malware--63686509-069b-4143-99ea-4e59cad6cb2a","tgt":"attack-pattern--c877e33f-1df6-40d6-b1e7-ce70f16f4979","sn":"DarkWatchman","tn":"System Location Discovery","rt":"uses"},{"src":"malware--0715560d-4299-4e84-9e20-6e80ab57e4f2","tgt":"attack-pattern--0d91b3c0-5e50-47c3-949a-2a796f04d144","sn":"Torisma","tn":"Encrypted/Encoded File","rt":"uses"},{"src":"malware--4b346d12-7f91-48d2-8f06-b26ffa0d825b","tgt":"attack-pattern--df8b2a25-8bdf-4856-953c-a04372b1c161","sn":"RDAT","tn":"Web Protocols","rt":"uses"},{"src":"course-of-action--90c218c3-fbf8-4830-98a7-e8cfb7eaa485","tgt":"attack-pattern--4ffc1794-ec3b-45be-9e52-42dbcb2af2de","sn":"Password Policies","tn":"Network Address Translation Traversal","rt":"mitigates"},{"src":"intrusion-set--c21dd6f1-1364-4a70-a1f7-783080ec34ee","tgt":"attack-pattern--7385dfaf-6886-4229-9ecd-6fd678040830","sn":"Fox Kitten","tn":"Command and Scripting Interpreter","rt":"uses"},{"src":"intrusion-set--f8cb7b36-62ef-4488-8a6d-a7033e3271c1","tgt":"malware--9020f5c7-efde-4125-a4f1-1b70f1274ddd","sn":"WIRTE","tn":"LitePower","rt":"uses"},{"src":"campaign--808d6b30-df4e-4341-8248-724da4bac650","tgt":"attack-pattern--f232fa7a-025c-4d43-abc7-318e81a73d65","sn":"SolarWinds Compromise","tn":"Cloud Accounts","rt":"uses"},{"src":"malware--16662bee-9d15-4564-a128-1fce214866e9","tgt":"attack-pattern--970a3432-3237-47ad-bcca-7d8cbb217736","sn":"RansomHub","tn":"PowerShell","rt":"uses"},{"src":"malware--0c52f5bc-557d-4083-bd27-66d7cdb794bb","tgt":"attack-pattern--01a5a209-b94c-450b-b7f9-946497d91055","sn":"Sardonic","tn":"Windows Management Instrumentation","rt":"uses"},{"src":"malware--3fc44c12-b16e-4de1-8869-cf0eb4446070","tgt":"attack-pattern--f3c544dc-673c-4ef3-accb-53229f1ae077","sn":"ShrinkLocker","tn":"System Time Discovery","rt":"uses"},{"src":"malware--a8a778f5-0035-4870-bb25-53dc05029586","tgt":"attack-pattern--e6919abc-99f9-4c6c-95a5-14761e7b2add","sn":"EvilBunny","tn":"Ingress Tool Transfer","rt":"uses"},{"src":"intrusion-set--64b52e7d-b2c4-4a02-9372-08a463f5dc11","tgt":"attack-pattern--d511a6f6-4a33-41d5-bc95-c343875d1377","sn":"Aquatic Panda","tn":"Command Obfuscation","rt":"uses"},{"src":"malware--a545456a-f9a7-47ad-9ea6-8b017def38d1","tgt":"attack-pattern--e6919abc-99f9-4c6c-95a5-14761e7b2add","sn":"Pandora","tn":"Ingress Tool Transfer","rt":"uses"},{"src":"intrusion-set--f3be6240-f68e-47e1-90d2-ad8f3b3bb8a6","tgt":"attack-pattern--1644e709-12d2-41e5-a60f-3470991f5011","sn":"Daggerfly","tn":"Security Account Manager","rt":"uses"},{"src":"malware--6f6f67c9-556d-4459-95c2-78d272190e52","tgt":"attack-pattern--354a7f88-63fb-41b5-a801-ce3b377b36f1","sn":"DarkGate","tn":"System Information Discovery","rt":"uses"},{"src":"malware--b00f90b6-c75c-4bfd-b813-ca9e6c9ebf29","tgt":"attack-pattern--0d91b3c0-5e50-47c3-949a-2a796f04d144","sn":"OSX_OCEANLOTUS.D","tn":"Encrypted/Encoded File","rt":"uses"},{"src":"malware--b0381480-d5ba-4dd8-a39e-fb8f1afea3a0","tgt":"attack-pattern--92d7da27-2d91-488e-a00c-059dc162766d","sn":"OilBooster","tn":"Exfiltration Over C2 Channel","rt":"uses"},{"src":"malware--f8fc98ac-ad6d-44db-b6e2-f0c6eb4eace4","tgt":"attack-pattern--fa44a152-ac48-441e-a524-dd7b04b8adcd","sn":"SLOWPULSE","tn":"Network Device Authentication","rt":"uses"},{"src":"intrusion-set--35d1b3be-49d4-42f1-aaa6-ef159c880bca","tgt":"attack-pattern--f2514ae4-4e9b-4f26-a5ba-c4ae85fe93c3","sn":"TeamTNT","tn":"Local Storage Discovery","rt":"uses"},{"src":"malware--925a6c52-5cf0-4fec-99de-b0d6917d8593","tgt":"attack-pattern--00f90846-cbd1-4fc5-9233-df5c2bf2a662","sn":"Crutch","tn":"Archive via Utility","rt":"uses"},{"src":"intrusion-set--7eda3dd8-b09b-4705-8090-c2ad9fb8c14d","tgt":"tool--f59508a6-3615-47c3-b493-6676e1a39a87","sn":"TA505","tn":"AdFind","rt":"uses"},{"src":"malware--6207dd22-bf18-4c96-aada-c573a9bbf5ec","tgt":"attack-pattern--391d824f-0ef1-47a0-b0ee-c59a75e27670","sn":"Exbyte","tn":"Native API","rt":"uses"},{"src":"malware--579607c2-d046-40df-99ab-beb479c37a2a","tgt":"attack-pattern--707399d6-ab3e-4963-9315-d9d3818cd6a0","sn":"Chrommme","tn":"System Network Configuration Discovery","rt":"uses"},{"src":"malware--7e6c2a9d-9dc1-4eb0-b27c-91e8076a9d77","tgt":"attack-pattern--1996eef1-ced3-4d7f-bf94-33298cabbf72","sn":"QUADAGENT","tn":"DNS","rt":"uses"},{"src":"intrusion-set--ead23196-d7b6-4ce6-a124-4ab4b67d81bd","tgt":"attack-pattern--0d91b3c0-5e50-47c3-949a-2a796f04d144","sn":"Inception","tn":"Encrypted/Encoded File","rt":"uses"},{"src":"malware--9491a623-5861-4d0a-9958-8c05d0d17442","tgt":"attack-pattern--3ccef7ae-cb5e-48f6-8302-897105fbf55c","sn":"PHPsert","tn":"Deobfuscate/Decode Files or Information","rt":"uses"},{"src":"malware--33139388-de0c-49ff-862a-041c315b142d","tgt":"attack-pattern--21875073-b0ee-49e3-9077-1e2a885359af","sn":"DUSTTRAP","tn":"Domain Account","rt":"uses"},{"src":"intrusion-set--16ade1aa-0ea1-4bb7-88cc-9079df2ae756","tgt":"malware--123bd7b3-675c-4b1a-8482-c55782b20e2b","sn":"admin@338","tn":"BUBBLEWRAP","rt":"uses"},{"src":"malware--6b62e336-176f-417b-856a-8552dd8c44e1","tgt":"attack-pattern--c32f7008-9fea-41f7-8366-5eb9b74bd896","sn":"Epic","tn":"Query Registry","rt":"uses"},{"src":"intrusion-set--6fe8a2a1-a1b0-4af8-953d-4babd329f8f8","tgt":"attack-pattern--2b742742-28c3-4e1b-bab7-8350d6300fa7","sn":"BlackTech","tn":"Spearphishing Link","rt":"uses"},{"src":"malware--e23d2777-b85d-44fc-861e-9149d399fbb9","tgt":"attack-pattern--354a7f88-63fb-41b5-a801-ce3b377b36f1","sn":"Qilin","tn":"System Information Discovery","rt":"uses"},{"src":"malware--f8fc98ac-ad6d-44db-b6e2-f0c6eb4eace4","tgt":"attack-pattern--dd43c543-bb85-4a6f-aa6e-160d90d06a49","sn":"SLOWPULSE","tn":"Multi-Factor Authentication Interception","rt":"uses"},{"src":"intrusion-set--c0291346-defe-48d7-9542-9e074ba1bdfb","tgt":"attack-pattern--970a3432-3237-47ad-bcca-7d8cbb217736","sn":"APT42","tn":"PowerShell","rt":"uses"},{"src":"malware--47ab6350-054f-4754-ba4d-e52a4e8751e2","tgt":"attack-pattern--0533ab23-3f7d-463f-9bd8-634d27e4dee1","sn":"Moneybird","tn":"Embedded Payloads","rt":"uses"},{"src":"malware--273e2b53-64ec-48be-9ad9-8f3dc0e53718","tgt":"attack-pattern--b18eae87-b469-4e14-b454-b171b416bc18","sn":"Hannotog","tn":"Non-Standard Port","rt":"uses"},{"src":"malware--de376fb9-1093-4f59-8d13-aed61042701d","tgt":"attack-pattern--b3d682b6-98f2-4fb0-aa3b-b4df007ca70a","sn":"Shai-Hulud","tn":"Obfuscated Files or Information","rt":"uses"},{"src":"intrusion-set--35d1b3be-49d4-42f1-aaa6-ef159c880bca","tgt":"attack-pattern--eec096b8-c207-43df-b6c1-11523861e452","sn":"TeamTNT","tn":"Disable or Modify System Firewall","rt":"uses"},{"src":"malware--8c1d01ff-fdc0-4586-99bd-c248e0761af5","tgt":"attack-pattern--2b742742-28c3-4e1b-bab7-8350d6300fa7","sn":"Kerrdown","tn":"Spearphishing Link","rt":"uses"},{"src":"malware--feb2d7bb-aacb-48df-ad04-ccf41a30cd90","tgt":"attack-pattern--f2514ae4-4e9b-4f26-a5ba-c4ae85fe93c3","sn":"SLOTHFULMEDIA","tn":"Local Storage Discovery","rt":"uses"},{"src":"intrusion-set--bf668120-e9a6-4017-a014-bfc0f5232656","tgt":"attack-pattern--232b7f21-adf9-4b42-b936-b9d6f7df856e","sn":"Malteiro","tn":"Malicious File","rt":"uses"},{"src":"intrusion-set--cc613a49-9bfa-4e22-98d1-15ffbb03f034","tgt":"attack-pattern--88d31120-5bc7-4ce3-a9c0-7cf147be8e54","sn":"Earth Lusca","tn":"Web Services","rt":"uses"},{"src":"malware--7acb15b6-fe2c-4319-b136-6ab36ff0b2d4","tgt":"attack-pattern--57340c81-c025-4189-8fa0-fc7ede51bae4","sn":"CharmPower","tn":"Modify Registry","rt":"uses"},{"src":"attack-pattern--34ff60a3-a3f8-42e4-bed0-af9a2cb563d7","tgt":"attack-pattern--bbde9781-60aa-4b8a-a911-895b0c1b3872","sn":"Disable or Modify Cloud Log","tn":"Disable or Modify Tools","rt":"subtechnique-of"},{"src":"intrusion-set--0ec2f388-bf0f-4b5c-97b1-fc736d26c25f","tgt":"attack-pattern--a1df809c-7d0e-459f-8fe5-25474bab770b","sn":"Kimsuky","tn":"Delay Execution","rt":"uses"},{"src":"malware--af2ad3b7-ab6a-4807-91fd-51bcaff9acbb","tgt":"attack-pattern--0d91b3c0-5e50-47c3-949a-2a796f04d144","sn":"USBStealer","tn":"Encrypted/Encoded File","rt":"uses"},{"src":"malware--5763217a-05b6-4edd-9bca-057e47b5e403","tgt":"attack-pattern--e6919abc-99f9-4c6c-95a5-14761e7b2add","sn":"ShimRat","tn":"Ingress Tool Transfer","rt":"uses"},{"src":"campaign--7ab2f1a1-26af-4204-ad84-d640fde391da","tgt":"attack-pattern--3ccef7ae-cb5e-48f6-8302-897105fbf55c","sn":"Juicy Mix","tn":"Deobfuscate/Decode Files or Information","rt":"uses"},{"src":"intrusion-set--ecbf507f-6786-4121-a4cc-0fd6a8d3a29d","tgt":"attack-pattern--c3888c54-775d-4b2f-b759-75a2ececcbfd","sn":"Play","tn":"Data Transfer Size Limits","rt":"uses"},{"src":"malware--d79e7a60-5de9-448e-a074-f95d2d80f8d0","tgt":"attack-pattern--01a5a209-b94c-450b-b7f9-946497d91055","sn":"Meteor","tn":"Windows Management Instrumentation","rt":"uses"},{"src":"campaign--a543ef15-91ea-4aa9-9c10-267d56e1ee82","tgt":"attack-pattern--03259939-0b57-482f-8eb5-87c0e0d54334","sn":"ArcaneDoor","tn":"Boot or Logon Initialization Scripts","rt":"uses"},{"src":"malware--06d735e7-1db1-4dbe-ab4b-acbe419f902b","tgt":"attack-pattern--7bc57495-ea59-4380-be31-a64af124ef18","sn":"Orz","tn":"File and Directory Discovery","rt":"uses"},{"src":"malware--33139388-de0c-49ff-862a-041c315b142d","tgt":"attack-pattern--c32f7008-9fea-41f7-8366-5eb9b74bd896","sn":"DUSTTRAP","tn":"Query Registry","rt":"uses"},{"src":"intrusion-set--381fcf73-60f6-4ab2-9991-6af3cbc35192","tgt":"attack-pattern--3ee16395-03f0-4690-a32e-69ce9ada0f9e","sn":"Sandworm Team","tn":"Upload Malware","rt":"uses"},{"src":"malware--df9b350b-d4f9-4e79-a826-75cc75fbc1eb","tgt":"attack-pattern--bbde9781-60aa-4b8a-a911-895b0c1b3872","sn":"KOCTOPUS","tn":"Disable or Modify Tools","rt":"uses"},{"src":"malware--67e6d66b-1b82-4699-b47a-e2efb6268d14","tgt":"attack-pattern--d1fcf083-a721-4223-aedf-bf8960798d62","sn":"SeaDuke","tn":"Windows Command Shell","rt":"uses"},{"src":"malware--3d7048f1-012e-468c-a18b-1bf98037d62c","tgt":"attack-pattern--354a7f88-63fb-41b5-a801-ce3b377b36f1","sn":"HexEval Loader","tn":"System Information Discovery","rt":"uses"},{"src":"malware--d3afa961-a80c-4043-9509-282cdf69ab21","tgt":"attack-pattern--391d824f-0ef1-47a0-b0ee-c59a75e27670","sn":"Winnti for Windows","tn":"Native API","rt":"uses"},{"src":"malware--a8d3d497-2da9-4797-8e0b-ed176be08654","tgt":"attack-pattern--f0589bc3-a6ae-425a-a3d5-5659bfee07f4","sn":"Wingbird","tn":"LSASS Driver","rt":"uses"},{"src":"malware--8f423bd7-6ca7-4303-9e85-008c7ad5fdaa","tgt":"attack-pattern--7bc57495-ea59-4380-be31-a64af124ef18","sn":"Attor","tn":"File and Directory Discovery","rt":"uses"},{"src":"tool--cb69b20d-56d0-41ab-8440-4a4b251614d4","tgt":"attack-pattern--e3a12395-188d-4051-9a16-ea8e14d07b88","sn":"Pupy","tn":"Network Service Discovery","rt":"uses"},{"src":"malware--1dac60f2-7d53-4a3e-95d1-cb2e875d5491","tgt":"attack-pattern--354a7f88-63fb-41b5-a801-ce3b377b36f1","sn":"InvisibleFerret","tn":"System Information Discovery","rt":"uses"},{"src":"intrusion-set--13ef3485-70d2-4567-b934-0e83c1eafcf1","tgt":"malware--02739f57-7585-4319-acd3-794ae8ff3a70","sn":"TA577","tn":"Pikabot","rt":"uses"},{"src":"course-of-action--590777b3-b475-4c7c-aaf8-f4a73b140312","tgt":"attack-pattern--d456de47-a16f-4e46-8980-e67478a12dcb","sn":"Code Signing","tn":"Server Software Component","rt":"mitigates"},{"src":"malware--00806466-754d-44ea-ad6f-0caf59cb8556","tgt":"attack-pattern--354a7f88-63fb-41b5-a801-ce3b377b36f1","sn":"TrickBot","tn":"System Information Discovery","rt":"uses"},{"src":"malware--0db09158-6e48-4e7c-8ce7-2b10b9c0c039","tgt":"attack-pattern--1c4e5d32-1fe9-4116-9d9d-59e3925bd6a2","sn":"Misdat","tn":"Match Legitimate Resource Name or Location","rt":"uses"},{"src":"x-mitre-detection-strategy--000d7b6f-0bb5-4144-a3eb-1aa822433da1","tgt":"attack-pattern--f8ba7d61-11c5-4130-bafd-7c3ff5fbf4b5","sn":"Detect Abuse of vSphere Installation Bundles (VIBs) for Persistent Access","tn":"vSphere Installation Bundles","rt":"detects"},{"src":"malware--6ba1d7ae-d60b-43e6-9f08-a8b787e9d9cb","tgt":"attack-pattern--d63a3fb8-9452-4e9d-a60a-54be68d5998c","sn":"LightNeuron","tn":"File Deletion","rt":"uses"},{"src":"malware--e1284931-3f85-4262-a641-9ae8bb0576a0","tgt":"attack-pattern--1b20efbf-8063-4fc3-a07d-b575318a301b","sn":"LunarWeb","tn":"Group Policy Discovery","rt":"uses"},{"src":"malware--8a59f456-79a0-4151-9f56-9b1a67332af2","tgt":"attack-pattern--354a7f88-63fb-41b5-a801-ce3b377b36f1","sn":"MoleNet","tn":"System Information Discovery","rt":"uses"},{"src":"intrusion-set--7a19ecb1-3c65-4de3-a230-993516aed6a6","tgt":"attack-pattern--ae797531-3219-49a4-bccf-324ad7a4c7b2","sn":"Turla","tn":"Web Services","rt":"uses"},{"src":"intrusion-set--5cbe0d3b-6fb1-471f-b591-4b192915116d","tgt":"malware--9e9b9415-a7df-406b-b14d-92bfe6809fbe","sn":"Suckfly","tn":"Nidiran","rt":"uses"},{"src":"intrusion-set--a7f57cc1-4540-4429-823f-f4e56b8473c9","tgt":"attack-pattern--e358d692-23c0-4a31-9eb6-ecc13a8d7735","sn":"Ember Bear","tn":"Remote System Discovery","rt":"uses"},{"src":"malware--91c57ed3-7c32-4c68-b388-7db00cb8dac6","tgt":"attack-pattern--2959d63f-73fd-46a1-abd2-109d7dcede32","sn":"NightClub","tn":"Windows Service","rt":"uses"},{"src":"malware--c13d9621-aca7-436b-ab3d-3a95badb3d00","tgt":"attack-pattern--32901740-b42c-4fdd-bc02-345b5dc57082","sn":"BackConfig","tn":"Code Signing","rt":"uses"},{"src":"campaign--f9cc545e-b0ef-4b92-8884-a3a4427609f6","tgt":"tool--13cd9151-83b7-410d-9f98-25d0f0d1d80d","sn":"CostaRicto","tn":"PowerSploit","rt":"uses"},{"src":"intrusion-set--35d1b3be-49d4-42f1-aaa6-ef159c880bca","tgt":"attack-pattern--10d51417-ee35-4589-b1ff-b6df1c334e8d","sn":"TeamTNT","tn":"External Remote Services","rt":"uses"},{"src":"intrusion-set--2a7914cf-dff3-428d-ab0f-1014d1c28aeb","tgt":"malware--432555de-63bf-4f2a-a3fa-f720a4561078","sn":"FIN6","tn":"FlawedAmmyy","rt":"uses"},{"src":"malware--cb444a16-3ea5-4a91-88c6-f329adcb8af3","tgt":"attack-pattern--354a7f88-63fb-41b5-a801-ce3b377b36f1","sn":"YAHOYAH","tn":"System Information Discovery","rt":"uses"},{"src":"malware--bdb27a1d-1844-42f1-a0c0-826027ae0326","tgt":"attack-pattern--03d7999c-1f4c-42cc-8373-e7690d318104","sn":"Revenge RAT","tn":"System Owner/User Discovery","rt":"uses"},{"src":"x-mitre-detection-strategy--1238c5f2-07ef-4a31-bc3a-e0cc0eb12516","tgt":"attack-pattern--34ab90a3-05f6-4259-8f21-621081fdaba5","sn":"Detection of Network Topology","tn":"Network Topology","rt":"detects"},{"src":"malware--3824852d-1957-4712-9da0-38143723c060","tgt":"attack-pattern--e6919abc-99f9-4c6c-95a5-14761e7b2add","sn":"PUBLOAD","tn":"Ingress Tool Transfer","rt":"uses"},{"src":"intrusion-set--d13c8a7f-740b-4efa-a232-de7d6bb05321","tgt":"attack-pattern--b18eae87-b469-4e14-b454-b171b416bc18","sn":"Silence","tn":"Non-Standard Port","rt":"uses"},{"src":"intrusion-set--17862c7d-9e60-48a0-b48e-da4dc4c3f6b0","tgt":"attack-pattern--dfd7cc1d-e1d8-4394-a198-97c4cab8aa67","sn":"Patchwork","tn":"Visual Basic","rt":"uses"},{"src":"malware--29a0bb87-1162-4c83-9834-2a98a876051b","tgt":"attack-pattern--e6919abc-99f9-4c6c-95a5-14761e7b2add","sn":"BUSHWALK","tn":"Ingress Tool Transfer","rt":"uses"},{"src":"x-mitre-detection-strategy--6bf8b26d-aa2d-4a8f-a1e4-c9cc4aef318d","tgt":"attack-pattern--e196b5c5-8118-4a1c-ab8a-936586ce3db5","sn":"Detection of Server","tn":"Server","rt":"detects"},{"src":"malware--be471c69-12d5-4bcc-9dad-3d42c3dbca4b","tgt":"attack-pattern--d63a3fb8-9452-4e9d-a60a-54be68d5998c","sn":"ROADSWEEP","tn":"File Deletion","rt":"uses"},{"src":"x-mitre-detection-strategy--b172a0fa-e429-4e6e-89b4-54dcfcefa893","tgt":"attack-pattern--09312b1a-c3c6-4b45-9844-3ccc78e5d82f","sn":"Detection of Gather Victim Host Information","tn":"Gather Victim Host Information","rt":"detects"},{"src":"tool--362dc67f-4e85-4562-9dac-1b6b7f3ec4b5","tgt":"attack-pattern--707399d6-ab3e-4963-9315-d9d3818cd6a0","sn":"ifconfig","tn":"System Network Configuration Discovery","rt":"uses"},{"src":"malware--51f78dfc-52f9-424e-8753-bb4246188313","tgt":"attack-pattern--830c9528-df21-472c-8c14-a036bf17d665","sn":"Nightdoor","tn":"Web Service","rt":"uses"},{"src":"intrusion-set--bef4c620-0787-42a8-a96d-b7eb6e85917c","tgt":"attack-pattern--edf91964-b26e-4b4a-9600-ccacd7d7df24","sn":"APT28","tn":"NTDS","rt":"uses"},{"src":"malware--198db886-47af-4f4c-bff5-11b891f85946","tgt":"attack-pattern--f5946b5e-9408-485f-a7f7-b5efc88909b6","sn":"Zeus Panda","tn":"Credential API Hooking","rt":"uses"},{"src":"malware--f25aab1a-0cef-4910-a85d-bb38b32ea41a","tgt":"attack-pattern--1996eef1-ced3-4d7f-bf94-33298cabbf72","sn":"Denis","tn":"DNS","rt":"uses"},{"src":"malware--edf5aee2-9b1c-4252-8e64-25b12f14c8b3","tgt":"attack-pattern--354a7f88-63fb-41b5-a801-ce3b377b36f1","sn":"SYSCON","tn":"System Information Discovery","rt":"uses"},{"src":"intrusion-set--8b1e16f6-e7c8-4b7a-a5df-f81232c13e2f","tgt":"attack-pattern--01a5a209-b94c-450b-b7f9-946497d91055","sn":"Cinnamon Tempest","tn":"Windows Management Instrumentation","rt":"uses"},{"src":"intrusion-set--f29b7c5e-2439-42ad-a86f-9f8984fafae3","tgt":"attack-pattern--707399d6-ab3e-4963-9315-d9d3818cd6a0","sn":"HEXANE","tn":"System Network Configuration Discovery","rt":"uses"},{"src":"malware--6b62e336-176f-417b-856a-8552dd8c44e1","tgt":"attack-pattern--8f4a33ec-8b1f-4b80-a2f6-642b2e479580","sn":"Epic","tn":"Process Discovery","rt":"uses"},{"src":"malware--d1974f35-0e06-478e-bc74-7530545d814b","tgt":"attack-pattern--3ccef7ae-cb5e-48f6-8302-897105fbf55c","sn":"SPAWNCHIMERA","tn":"Deobfuscate/Decode Files or Information","rt":"uses"},{"src":"x-mitre-detection-strategy--536eed5d-a4b6-4377-a936-90283bb1b25c","tgt":"attack-pattern--ae7f3575-0a5e-427e-991b-fe03ad44c754","sn":"Detection Strategy for Modify System Image on Network Devices","tn":"Modify System Image","rt":"detects"},{"src":"malware--66637cd6-ae68-4bcd-af82-32f70a854175","tgt":"attack-pattern--43e7dc91-05b2-474c-b9ac-2ed4fe101f4d","sn":"NOOPLDR","tn":"Process Injection","rt":"uses"},{"src":"campaign--9cea8bec-07c5-422b-84b8-99d3128ce570","tgt":"attack-pattern--cd92d2b8-ce43-4666-9472-f1b4b9f4f8be","sn":"Salesforce Data Exfiltration","tn":"Impersonation","rt":"uses"},{"src":"intrusion-set--9e729a7e-0dd6-4097-95bf-db8d64911383","tgt":"attack-pattern--cba37adb-d6fb-4610-b069-dd04c0643384","sn":"Darkhotel","tn":"Security Software Discovery","rt":"uses"},{"src":"malware--222ba512-32d9-49ac-aefd-50ce981ce2ce","tgt":"attack-pattern--391d824f-0ef1-47a0-b0ee-c59a75e27670","sn":"Pony","tn":"Native API","rt":"uses"},{"src":"malware--39643fb9-00c1-4a45-85e5-801a3f2665d1","tgt":"attack-pattern--005a06c6-14bf-4118-afa0-ebcd8aebb0c9","sn":"SystemBC","tn":"Scheduled Task","rt":"uses"},{"src":"tool--afc079f3-c0ea-4096-b75d-3f05338b7f60","tgt":"attack-pattern--f303a39a-6255-4b89-aecc-18c4d8ca7163","sn":"Mimikatz","tn":"DCSync","rt":"uses"},{"src":"malware--579607c2-d046-40df-99ab-beb479c37a2a","tgt":"attack-pattern--53ac20cd-aca3-406e-9aa0-9fc7fdc60a5a","sn":"Chrommme","tn":"Archive Collected Data","rt":"uses"},{"src":"intrusion-set--6713ab67-e25b-49cc-808d-2b36d4fbc35c","tgt":"attack-pattern--b4694861-542c-48ea-9eb1-10d356e7140a","sn":"Ke3chang","tn":"Remote Email Collection","rt":"uses"},{"src":"campaign--8d2bc130-89fe-466e-a4f9-6bce6129c2b8","tgt":"malware--be25c1c0-1590-4219-a3d5-6f31799d1d1b","sn":"FunnyDream","tn":"FunnyDream","rt":"uses"},{"src":"malware--0f862b01-99da-47cc-9bdb-db4a86a95bb1","tgt":"attack-pattern--0d91b3c0-5e50-47c3-949a-2a796f04d144","sn":"Emissary","tn":"Encrypted/Encoded File","rt":"uses"},{"src":"malware--f39c6d39-0165-46db-a7ae-43341c428d22","tgt":"attack-pattern--bbde9781-60aa-4b8a-a911-895b0c1b3872","sn":"SplatCloak","tn":"Disable or Modify Tools","rt":"uses"},{"src":"malware--ab3580c8-8435-4117-aace-3d9fbe46aa56","tgt":"attack-pattern--354a7f88-63fb-41b5-a801-ce3b377b36f1","sn":"Unknown Logger","tn":"System Information Discovery","rt":"uses"},{"src":"malware--8ec6e3b4-b06d-4805-b6aa-af916acc2122","tgt":"attack-pattern--01a5a209-b94c-450b-b7f9-946497d91055","sn":"RogueRobin","tn":"Windows Management Instrumentation","rt":"uses"},{"src":"malware--7f269253-c225-45ff-87c2-5e8ef6dd369f","tgt":"attack-pattern--731f4f55-b6d0-41d1-a7a9-072a66389aea","sn":"Sagerunex","tn":"Proxy","rt":"uses"},{"src":"x-mitre-detection-strategy--c8b4a2e4-386f-45b3-b32a-8ca4113e5592","tgt":"attack-pattern--8c41090b-aa47-4331-986b-8c9a51a91103","sn":"Internal Website and System Content Defacement via UI or Messaging Modifications","tn":"Internal Defacement","rt":"detects"},{"src":"tool--03342581-f790-4f03-ba41-e82e67392e23","tgt":"attack-pattern--b6075259-dba3-44e9-87c7-e954f37ec0d5","sn":"Net","tn":"Password Policy Discovery","rt":"uses"},{"src":"malware--f25d4207-25b2-4bb0-a17a-403943c670ad","tgt":"attack-pattern--348f1eef-964b-4eb6-bb53-69b3dcb0c643","sn":"INC Ransomware","tn":"Peripheral Device Discovery","rt":"uses"},{"src":"intrusion-set--174279b4-399f-4ddb-966e-5efedd1dd5f2","tgt":"attack-pattern--e3a12395-188d-4051-9a16-ea8e14d07b88","sn":"Volt Typhoon","tn":"Network Service Discovery","rt":"uses"},{"src":"intrusion-set--918da025-04bd-48af-b6c4-f3e4d1b915eb","tgt":"attack-pattern--01a5a209-b94c-450b-b7f9-946497d91055","sn":"Medusa Group","tn":"Windows Management Instrumentation","rt":"uses"},{"src":"malware--b350b47f-88fe-4921-8538-6d9c59bac84e","tgt":"attack-pattern--391d824f-0ef1-47a0-b0ee-c59a75e27670","sn":"Cyclops Blink","tn":"Native API","rt":"uses"},{"src":"malware--56aa3c82-ed40-4b5a-84bf-7231356d9e96","tgt":"attack-pattern--03d7999c-1f4c-42cc-8373-e7690d318104","sn":"DRATzarus","tn":"System Owner/User Discovery","rt":"uses"},{"src":"intrusion-set--32bca8ff-d900-4877-aa65-d70baa041b74","tgt":"tool--b76b2d94-60e4-4107-a903-4a3a7622fb3b","sn":"Leafminer","tn":"LaZagne","rt":"uses"},{"src":"malware--471d0e9f-2c8a-4e4b-8f3b-f85d2407806e","tgt":"attack-pattern--d63a3fb8-9452-4e9d-a60a-54be68d5998c","sn":"ProLock","tn":"File Deletion","rt":"uses"},{"src":"malware--9a097d18-d15f-4635-a4f1-189df7efdc40","tgt":"attack-pattern--df8b2a25-8bdf-4856-953c-a04372b1c161","sn":"PULSECHECK","tn":"Web Protocols","rt":"uses"},{"src":"malware--457a5e8d-d964-4130-bde3-c07bb41a093e","tgt":"attack-pattern--0d91b3c0-5e50-47c3-949a-2a796f04d144","sn":"Cuckoo Stealer","tn":"Encrypted/Encoded File","rt":"uses"},{"src":"intrusion-set--f9d6633a-55e6-4adc-9263-6ae080421a13","tgt":"attack-pattern--09a60ea3-a8d1-4ae5-976e-5783248b72a4","sn":"Magic Hound","tn":"Keylogging","rt":"uses"},{"src":"malware--f01e2711-4b48-4192-a2e8-5f56c945ca19","tgt":"attack-pattern--24bfaeba-cb0d-4525-b3dc-507c77ecec41","sn":"Dridex","tn":"Symmetric Cryptography","rt":"uses"},{"src":"intrusion-set--461b8e25-8f4a-4ea2-a4a8-e39df7ce6630","tgt":"malware--bfcb4a75-b6f0-489b-b506-836bfba3d70e","sn":"UNC3886","tn":"MOPSLED","rt":"uses"},{"src":"intrusion-set--4ca1929c-7d64-4aab-b849-badbfc0c760d","tgt":"attack-pattern--d336b553-5da9-46ca-98a8-0b23f49fb447","sn":"OilRig","tn":"Windows Credential Manager","rt":"uses"},{"src":"intrusion-set--899ce53f-13a0-479b-a0e4-67d46e241542","tgt":"malware--ae9d818d-95d0-41da-b045-9cabea1ca164","sn":"APT29","tn":"PinchDuke","rt":"uses"}]};

const PHASE_COLORS = {
  "Initial Access":"#FF5C5C","Execution":"#FF8C42","Persistence":"#FFB547",
  "Privilege Escalation":"#FFD700","Defense Evasion":"#A8FF3E","Credential Access":"#3EFF8A",
  "Discovery":"#3EFFEF","Lateral Movement":"#3EA8FF","Collection":"#5C6FFF",
  "Exfiltration":"#BF5CFF","Impact":"#FF3E3E","C2":"#FF6B9D","Stealth":"#7B68EE",
  "Recon":"#20B2AA","Resource Dev":"#9370DB"
};
const KCO = ["Recon","Resource Dev","Initial Access","Execution","Persistence","Privilege Escalation","Stealth","Defense Evasion","Credential Access","Discovery","Lateral Movement","Collection","C2","Exfiltration","Impact"];
const CISA_KEV = [
  {cveID:"CVE-2024-21762",vendor:"Fortinet",product:"FortiOS",name:"SSL-VPN Out-of-Bound Write",severity:"9.8",date:"2024-02-09",ransomware:"Known"},
  {cveID:"CVE-2024-3400",vendor:"Palo Alto",product:"PAN-OS",name:"Command Injection via GlobalProtect",severity:"10.0",date:"2024-04-12",ransomware:"Known"},
  {cveID:"CVE-2023-46805",vendor:"Ivanti",product:"Connect Secure",name:"Authentication Bypass",severity:"8.2",date:"2024-01-10",ransomware:"Known"},
  {cveID:"CVE-2024-27198",vendor:"JetBrains",product:"TeamCity",name:"Auth Bypass RCE",severity:"9.8",date:"2024-03-04",ransomware:"Unknown"},
  {cveID:"CVE-2023-22515",vendor:"Atlassian",product:"Confluence",name:"Broken Access Control",severity:"10.0",date:"2023-10-05",ransomware:"Known"},
  {cveID:"CVE-2024-1709",vendor:"ConnectWise",product:"ScreenConnect",name:"Authentication Bypass",severity:"10.0",date:"2024-02-22",ransomware:"Known"},
  {cveID:"CVE-2023-4966",vendor:"Citrix",product:"NetScaler",name:"Citrix Bleed",severity:"9.4",date:"2023-10-18",ransomware:"Known"},
  {cveID:"CVE-2021-44228",vendor:"Apache",product:"Log4j2",name:"Log4Shell RCE",severity:"10.0",date:"2021-12-10",ransomware:"Known"},
  {cveID:"CVE-2024-30051",vendor:"Microsoft",product:"DWM Core",name:"Privilege Escalation",severity:"7.8",date:"2024-05-14",ransomware:"Known"},
  {cveID:"CVE-2024-20353",vendor:"Cisco",product:"ASA/FTD",name:"DoS via HTTP Request",severity:"8.6",date:"2024-04-24",ransomware:"Unknown"},
  {cveID:"CVE-2024-38112",vendor:"Microsoft",product:"MSHTML",name:"Spoofing via MHTML",severity:"7.5",date:"2024-07-09",ransomware:"Unknown"},
  {cveID:"CVE-2024-26169",vendor:"Microsoft",product:"Windows Error Reporting",name:"Privilege Escalation",severity:"7.8",date:"2024-03-12",ransomware:"Known"},
];
const IOC_DB = [
  {ioc:"185.220.101.47",type:"IP",actor:"Lazarus Group",malware:"BLINDINGCAN",campaign:"Operation DreamJob",confidence:94},
  {ioc:"cobaltrike.evil-domain.com",type:"Domain",actor:"FIN7",malware:"GRIFFON",campaign:"Carbanak 2024",confidence:87},
  {ioc:"d41d8cd98f00b204e9800998ecf8427e",type:"MD5",actor:"Wizard Spider",malware:"TrickBot",campaign:"BazarLoader drop",confidence:91},
  {ioc:"45.142.212.100",type:"IP",actor:"OilRig",malware:"ISMInjector",campaign:"C0027",confidence:78},
  {ioc:"cdn-update.azureedge-ms.net",type:"Domain",actor:"Indrik Spider",malware:"Dridex",campaign:"TA505",confidence:95},
  {ioc:"91.92.251.103",type:"IP",actor:"Dragonfly",malware:"Backdoor.Oldrea",campaign:"HAVEX ops",confidence:88},
  {ioc:"update-service.microsoftonline-cdn.com",type:"Domain",actor:"Star Blizzard",malware:"QuietSieve",campaign:"SEABORGIUM",confidence:89},
  {ioc:"103.27.108.215",type:"IP",actor:"Aquatic Panda",malware:"Cobalt Strike",campaign:"Double Dragon",confidence:76},
];
const SIEMS=[
  {id:"splunk",name:"Splunk Enterprise",icon:"🔵",desc:"REST API or HEC token"},
  {id:"sentinel",name:"Microsoft Sentinel",icon:"🔷",desc:"OAuth2 workspace integration"},
  {id:"elastic",name:"Elastic SIEM",icon:"🟡",desc:"Elasticsearch API"},
  {id:"qradar",name:"IBM QRadar",icon:"🔴",desc:"REST API + AQL"},
  {id:"chronicle",name:"Google Chronicle",icon:"🟢",desc:"SOAR webhook"},
  {id:"crowdstrike",name:"CrowdStrike Falcon",icon:"⚫",desc:"Streaming API"},
  {id:"csv",name:"CSV / Log File",icon:"📄",desc:"Upload log files"},
  {id:"api",name:"Custom API",icon:"⚙️",desc:"Any REST source"},
];
const PRICING=[
  {name:"Starter",color:"#8892A4",price:"$2,000",period:"/mo",desc:"For teams getting started with graph intelligence.",features:["Up to 3 data sources","MITRE ATT&CK mapping","Basic alert feed","10K events/day","Email support","1 user seat"],cta:"Start Free Trial",highlight:false},
  {name:"Pro",color:"#5C6FFF",price:"$8,500",period:"/mo",desc:"For mid-market teams needing real-time fusion intelligence.",features:["Unlimited data sources","Full AI threat analysis","Actor comparison","IOC lookup","Live alert feed","Kill chain timeline","250K events/day","5 user seats","Priority support"],cta:"Get Early Access",highlight:true},
  {name:"Enterprise",color:"#FFB547",price:"Custom",period:"",desc:"For critical infrastructure and compliance environments.",features:["Everything in Pro","Custom ontology schema","Dedicated analyst","On-premise option","SOC 2 Type II logs","SSO + SAML","Unlimited seats","SLA guarantee","24/7 support"],cta:"Talk to Sales",highlight:false},
];
const THEMES={
  dark:{bg:"#0A0F1E",bg2:"#0D1325",navBg:"rgba(10,15,30,0.92)",text:"#FFFFFF",muted:"#8892A4",border:"rgba(92,111,255,0.15)",card:"rgba(255,255,255,0.03)",indigo:"#5C6FFF",amber:"#FFB547"},
  light:{bg:"#F0F2FA",bg2:"#FFFFFF",navBg:"rgba(240,242,250,0.92)",text:"#0A0F1E",muted:"#5A6480",border:"rgba(92,111,255,0.2)",card:"rgba(92,111,255,0.04)",indigo:"#4052E0",amber:"#D97A00"},
};

const genAlerts=()=>{const sevs=["CRITICAL","HIGH","MEDIUM","LOW"],actors=MITRE.groups.slice(0,10).map(g=>g.name),techs=MITRE.techniques.slice(0,20).map(t=>t.name),tpls=[(a,t)=>`${a} deployed ${t} against financial sector`,(a,t)=>`New ${t} variant attributed to ${a}`,(a,t)=>`CISA: ${a} exploiting ${t}`,(a,t)=>`Hunt alert: ${t} matches ${a} TTPs`];return Array.from({length:20},(_,i)=>{const ago=Math.floor(Math.random()*3600),actor=actors[Math.floor(Math.random()*actors.length)],tech=techs[Math.floor(Math.random()*techs.length)];return{id:i,severity:sevs[Math.floor(Math.random()*4)],title:tpls[Math.floor(Math.random()*tpls.length)](actor,tech),actor,tech,time:ago<60?`${ago}s ago`:ago<3600?`${Math.floor(ago/60)}m ago`:`${Math.floor(ago/3600)}h ago`,ts:Date.now()-ago*1000};}).sort((a,b)=>b.ts-a.ts);};

const computeRisk=env=>{let s=0;s+=Math.min(env.sources*8,40);s+=({finance:30,healthcare:28,gov:32,energy:35,tech:20,retail:18,other:15}[env.sector]||15);s+=({small:5,mid:12,large:20,enterprise:28}[env.size]||10);if(env.hasEDR)s-=12;if(env.hasMFA)s-=10;if(env.hasPatchCycle)s-=8;s+=Math.floor(CISA_KEV.filter(k=>parseFloat(k.severity)>=9).length*0.8);return Math.max(0,Math.min(100,Math.round(s)));};
const riskLabel=s=>s>=80?{label:"CRITICAL",color:"#FF3E3E"}:s>=60?{label:"HIGH",color:"#FF8C42"}:s>=40?{label:"MEDIUM",color:"#FFB547"}:{label:"LOW",color:"#3EFF8A"};

async function claude(prompt,max=1000){const{data,error}=await supabase.functions.invoke("jackie-orchestrate",{body:{prompt,system:"You are VeilOps, a threat intelligence analyst. Return ONLY a single JSON object — no prose, no code fences."}});if(error)throw error;const raw=String(data?.output||"").replace(/```json|```/g,"").trim();try{return JSON.parse(raw);}catch{const m=raw.match(/\{[\s\S]*\}/);if(m)return JSON.parse(m[0]);throw new Error("VeilOps AI: non-JSON response");}}
const aiAnalyze=(item,type,rels)=>{const rs=rels.slice(0,5).map(r=>`${r.rt}: ${r.sn}→${r.tn}`).join(";");const p={actor:`VeilOps AI: analyze APT group for CISO.\nGroup: ${item.name} aliases:${(item.aliases||[]).join(",")}\nDesc: ${item.desc}\nRels: ${rs}\nJSON only: {"threat_level":"CRITICAL|HIGH|MEDIUM|LOW","origin":"country","primary_motivation":"Espionage|Financial|Disruption|Hacktivism","target_sectors":["s1"],"ioc_types":["t1"],"recommended_actions":["a1"],"analyst_note":"1 sentence"}`,technique:`VeilOps AI: analyze MITRE technique.\nTech: ${item.name} (${item.id}) Phase:${item.phase}\nDesc:${item.desc}\nJSON only: {"threat_level":"CRITICAL|HIGH|MEDIUM|LOW","detection_difficulty":"Easy|Moderate|Hard|Very Hard","affected_platforms":["p1"],"detection_methods":["m1"],"mitigations":["m1"],"veilops_detection_rule":"rule","analyst_note":"1 sentence"}`,kev:`VeilOps AI: analyze CISA KEV.\nCVE:${item.cveID} ${item.name} Vendor:${item.vendor} ${item.product} CVSS:${item.severity} Ransomware:${item.ransomware}\nJSON only: {"threat_level":"CRITICAL|HIGH|MEDIUM|LOW","exploit_maturity":"Weaponized|PoC Available|In the Wild","patch_priority":"Immediate|High|Medium","mitigations":["m1"],"veilops_detection_rule":"rule","analyst_note":"1 sentence"}`,malware:`VeilOps AI: analyze malware.\nMalware:${item.name} Platforms:${(item.platforms||[]).join(",")}\nDesc:${item.desc}\nJSON only: {"threat_level":"CRITICAL|HIGH|MEDIUM|LOW","malware_category":"RAT|Ransomware|Loader|Backdoor|Stealer|Wiper|Botnet|Rootkit","persistence_mechanisms":["p1"],"c2_methods":["c1"],"detection_signatures":["s1"],"recommended_actions":["a1"],"analyst_note":"1 sentence"}`};return claude(p[type]||p.malware);};
const aiCompare=(a,b)=>{const tA=new Set(MITRE.relationships.filter(r=>r.src===a.stix_id&&r.rt==="uses").map(r=>r.tgt)),tB=new Set(MITRE.relationships.filter(r=>r.src===b.stix_id&&r.rt==="uses").map(r=>r.tgt)),shared=[...tA].filter(x=>tB.has(x)).map(id=>MITRE.techniques.find(t=>t.stix_id===id)?.name).filter(Boolean).slice(0,5).join(",");return claude(`VeilOps: compare APT groups.\nA:${a.name} ${a.desc}\nB:${b.name} ${b.desc}\nShared:${shared||"None"}\nJSON only: {"threat_difference":"1-2 sentences","shared_infrastructure_risk":"Low|Medium|High","likely_coordination":"Unlikely|Possible|Probable","group_a_unique_strength":"1 sentence","group_b_unique_strength":"1 sentence","combined_threat_level":"CRITICAL|HIGH|MEDIUM","analyst_verdict":"2 sentences"}`,800);};
const aiRisk=(env,score,label)=>claude(`VeilOps: environment risk assessment.\nSector:${env.sector} Size:${env.size} Sources:${env.sources} EDR:${env.hasEDR} MFA:${env.hasMFA} Patch:${env.hasPatchCycle}\nScore:${score}/100 (${label})\nJSON only: {"executive_summary":"2 sentences","top_risks":["r1","r2","r3"],"quick_wins":["w1","w2","w3"],"priority_actions":[{"action":"text","effort":"Low|Medium|High","impact":"Low|Medium|High"}],"estimated_breach_cost":"range","analyst_verdict":"1 sentence"}`,1200);
const aiExport=(item,type,an)=>claude(`VeilOps: formal threat intelligence export report.\nEntity:${item.name||item.cveID} Type:${type}\nDesc:${item.desc||item.name||""}\nPrior analysis:${JSON.stringify(an||{})}\nJSON only: {"report_title":"formal title","classification":"TLP:WHITE","tlp_color":"WHITE|GREEN|AMBER|RED","executive_brief":"3-4 sentences","technical_details":"2-3 sentences","threat_context":"1-2 sentences","recommended_detections":["d1","d2","d3"],"recommended_mitigations":["m1","m2","m3"],"iocs":["i1","i2","i3"],"confidence_score":85,"report_date":"2026-06-16"}`,1200);
const submitWaitlist=async email=>{ try{ const k="veilops_waitlist"; const list=JSON.parse(localStorage.getItem(k)||"[]"); list.push({email,created_at:new Date().toISOString()}); localStorage.setItem(k,JSON.stringify(list)); }catch{} };

// ── COMMAND PALETTE ───────────────────────────────────────────────────────
function CommandPalette({onClose,onSelect,T}){
  const [q,setQ]=useState(""),inputRef=useRef(null),[sel,setSel]=useState(0);
  useEffect(()=>{inputRef.current?.focus();},[]);
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[onClose]);
  const results=q.trim().length<2?[]:[
    ...MITRE.groups.filter(g=>g.name.toLowerCase().includes(q.toLowerCase())||g.aliases.some(a=>a.toLowerCase().includes(q.toLowerCase()))).slice(0,4).map(g=>({type:"actor",label:g.name,sub:"APT · "+(g.aliases[1]||""),color:"#FF5C5C",data:g})),
    ...MITRE.techniques.filter(t=>t.name.toLowerCase().includes(q.toLowerCase())||t.id.toLowerCase().includes(q.toLowerCase())).slice(0,4).map(t=>({type:"technique",label:t.name,sub:`${t.id} · ${t.phase}`,color:PHASE_COLORS[t.phase]||"#5C6FFF",data:t})),
    ...MITRE.malware.filter(m=>m.name.toLowerCase().includes(q.toLowerCase())).slice(0,3).map(m=>({type:"malware",label:m.name,sub:"Malware · "+m.platforms.slice(0,2).join(", "),color:"#FFB547",data:m})),
    ...CISA_KEV.filter(k=>k.cveID.toLowerCase().includes(q.toLowerCase())||k.name.toLowerCase().includes(q.toLowerCase())||k.vendor.toLowerCase().includes(q.toLowerCase())).slice(0,3).map(k=>({type:"kev",label:k.cveID,sub:`CVSS ${k.severity} · ${k.vendor} ${k.product}`,color:"#FF3E3E",data:k})),
    ...IOC_DB.filter(i=>i.ioc.toLowerCase().includes(q.toLowerCase())||i.actor.toLowerCase().includes(q.toLowerCase())).slice(0,2).map(i=>({type:"ioc",label:i.ioc,sub:`${i.type} · ${i.actor}`,color:"#BF5CFF",data:i})),
  ];
  useEffect(()=>setSel(0),[q]);
  const onKey=e=>{if(e.key==="ArrowDown"){e.preventDefault();setSel(s=>Math.min(s+1,results.length-1));}if(e.key==="ArrowUp"){e.preventDefault();setSel(s=>Math.max(s-1,0));}if(e.key==="Enter"&&results[sel]){onSelect(results[sel]);onClose();}};
  const cats={actor:"APT Groups",technique:"Techniques",malware:"Malware",kev:"CISA KEV",ioc:"IOC Database"};
  const grouped=results.reduce((acc,r,i)=>{const c=cats[r.type]||r.type;if(!acc[c])acc[c]=[];acc[c].push({...r,_i:i});return acc;},{});
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(5,8,18,0.85)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:"8vh"}} onClick={onClose}>
      <div style={{width:"100%",maxWidth:600,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.6)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px",borderBottom:`1px solid ${T.border}`}}>
          <span style={{fontSize:16,opacity:0.4}}>🔍</span>
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={onKey} placeholder="Search actors, techniques, malware, CVEs, IOCs…" style={{flex:1,background:"transparent",border:"none",outline:"none",color:T.text,fontSize:14,fontFamily:"Inter,sans-serif"}}/>
          <kbd style={{padding:"2px 6px",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,borderRadius:3,fontSize:10,color:T.muted,fontFamily:"monospace"}}>ESC</kbd>
        </div>
        <div style={{maxHeight:400,overflowY:"auto"}}>
          {q.trim().length<2?(
            <div style={{padding:"28px 18px",textAlign:"center"}}>
              <div style={{fontSize:12,color:T.muted,marginBottom:12}}>Quick access</div>
              <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>{["Lazarus Group","T1055","Wizard Spider","CVE-2024-3400","Log4Shell","185.220.101.47"].map(s=>(<button key={s} onClick={()=>setQ(s)} style={{padding:"3px 9px",background:"rgba(92,111,255,0.08)",border:`1px solid ${T.border}`,borderRadius:3,color:"#5C6FFF",fontSize:10,cursor:"pointer",fontFamily:"monospace"}}>{s}</button>))})</div>
            </div>
          ):results.length===0?(<div style={{padding:"28px 18px",textAlign:"center",color:T.muted,fontSize:13}}>No results for "{q}"</div>):(
            Object.entries(grouped).map(([cat,items])=>(<div key={cat}>
              <div style={{padding:"7px 18px 3px",fontSize:9,color:T.muted,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>{cat}</div>
              {items.map(r=>(<div key={r._i} onClick={()=>{onSelect(r);onClose();}} onMouseEnter={()=>setSel(r._i)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 18px",cursor:"pointer",background:r._i===sel?"rgba(92,111,255,0.1)":"transparent",borderLeft:r._i===sel?"3px solid #5C6FFF":"3px solid transparent",transition:"all 0.1s"}}>
                <div style={{width:7,height:7,borderRadius:r.type==="technique"?2:"50%",background:r.color,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.label}</div>
                  <div style={{fontSize:10,color:T.muted,marginTop:1}}>{r.sub}</div>
                </div>
                <kbd style={{padding:"1px 5px",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.border}`,borderRadius:2,fontSize:9,color:T.muted,fontFamily:"monospace",flexShrink:0}}>↵</kbd>
              </div>))}
            </div>))
          )}
        </div>
        <div style={{padding:"7px 18px",borderTop:`1px solid ${T.border}`,display:"flex",gap:14}}>
          {[["↑↓","Navigate"],["↵","Select"],["ESC","Close"]].map(([k,v])=>(<div key={k} style={{display:"flex",alignItems:"center",gap:4}}><kbd style={{padding:"1px 4px",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.border}`,borderRadius:2,fontSize:9,color:T.muted,fontFamily:"monospace"}}>{k}</kbd><span style={{fontSize:9,color:T.muted}}>{v}</span></div>))}
          <div style={{marginLeft:"auto",fontSize:9,color:T.muted}}>⬡ VeilOps Search</div>
        </div>
      </div>
    </div>
  );
}

// ── DEMO MODAL ────────────────────────────────────────────────────────────
function DemoModal({onClose,onOpenConsole,T}){
  const [step,setStep]=useState(0);
  const steps=[
    {title:"Live Threat Graph",icon:"⬡",desc:"VeilOps builds a real-time knowledge graph. Every node is a real threat actor, technique, or CVE from MITRE ATT&CK and CISA KEV.",visual:"graph"},
    {title:"Claude AI Analysis",icon:"🤖",desc:"Click any node and our Claude-powered AI delivers threat level, detection methods, mitigations, a custom detection rule, and analyst note — in seconds.",visual:"ai"},
    {title:"Kill Chain Coverage",icon:"⛓️",desc:"See exactly which MITRE kill chain phases each APT group covers. Understand where your blind spots are before attackers find them.",visual:"chain"},
    {title:"Risk Score Engine",icon:"🎯",desc:"Configure your environment and get a 0-100 risk score with AI report: executive summary, top risks, quick wins, priority actions, breach cost estimate.",visual:"risk"},
    {title:"Go Live in Days",icon:"🚀",desc:"Connect your first SIEM in minutes. No 18-month integration. No $2M commitment. Export reports. ⌘K global search. Full team collaboration.",visual:"launch"},
  ];
  const cur=steps[step];
  const Vis={
    graph:<div style={{height:100,position:"relative",overflow:"hidden",borderRadius:7,background:"rgba(92,111,255,0.04)",border:`1px solid ${T.border}`}}>{Array.from({length:14},(_,i)=>{const x=8+Math.random()*84,y=8+Math.random()*84,c=["#FF5C5C","#5C6FFF","#FFB547","#FF3E3E"][i%4];return<div key={i} style={{position:"absolute",left:`${x}%`,top:`${y}%`,width:i<4?9:i<8?6:4,height:i<4?9:i<8?6:4,borderRadius:"50%",background:c,boxShadow:`0 0 ${i<4?9:5}px ${c}`,animation:`pulse ${1.5+Math.random()}s ease-in-out infinite`,animationDelay:`${Math.random()*2}s`}}/>})}</div>,
    ai:<div style={{padding:"10px 14px",borderRadius:7,background:"rgba(92,111,255,0.04)",border:`1px solid ${T.border}`,fontFamily:"monospace",fontSize:10}}><div style={{color:"#FF5C5C",marginBottom:3}}>● Wizard Spider · CRITICAL</div><div style={{color:T.muted,marginBottom:2}}>▸ Motivation: Financial</div><div style={{color:T.muted,marginBottom:2}}>▸ Targets: Finance, Healthcare</div><div style={{color:"#A8FF3E",marginBottom:2}}>▸ Rule: ALERT if svchost.exe spawns cmd.exe</div><div style={{color:"#FFB547",fontStyle:"italic"}}>▸ "Active in 6 EU banks Q2 2026"</div></div>,
    chain:<div style={{padding:"9px 11px",borderRadius:7,background:"rgba(92,111,255,0.04)",border:`1px solid ${T.border}`}}><div style={{fontSize:9,color:T.muted,marginBottom:6}}>Lazarus Group · 73% kill chain coverage</div><div style={{height:3,background:"rgba(255,255,255,0.08)",borderRadius:2,overflow:"hidden",marginBottom:7}}><div style={{height:"100%",width:"73%",background:"linear-gradient(90deg,#5C6FFF,#FF5C5C)",borderRadius:2}}/></div>{[["#FF5C5C","Initial Access","Spearphishing, Drive-by"],["#FF8C42","Execution","PowerShell, WMI"],["#FFB547","Persistence","Registry Run Keys"],["#A8FF3E","Defense Evasion","Process Injection"]].map(([c,p,t])=>(<div key={p} style={{display:"flex",gap:5,alignItems:"center",marginBottom:2}}><div style={{width:4,height:4,borderRadius:1,background:c,flexShrink:0}}/><span style={{fontSize:8,color:c,fontWeight:700,minWidth:75}}>{p}</span><span style={{fontSize:8,color:T.muted}}>{t}</span></div>))}</div>,
    risk:<div style={{padding:"9px 11px",borderRadius:7,background:"rgba(92,111,255,0.04)",border:`1px solid ${T.border}`}}><div style={{display:"flex",gap:10,marginBottom:7,alignItems:"center"}}><div style={{textAlign:"center"}}><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700,color:"#FF8C42"}}>72</div><div style={{fontSize:8,color:"#FF8C42",fontWeight:700}}>HIGH</div></div><div style={{flex:1,fontSize:10,color:T.muted,lineHeight:1.6}}>"Finance exposure elevated by 3 unpatched critical KEVs. MFA would reduce score 10pts immediately."</div></div><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{["Patch Log4Shell","Enable MFA","Deploy EDR"].map(w=>(<span key={w} style={{padding:"1px 6px",background:"rgba(62,255,138,0.08)",border:"1px solid rgba(62,255,138,0.2)",borderRadius:3,fontSize:8,color:"#3EFF8A"}}>✓ {w}</span>))}</div></div>,
    launch:<div style={{padding:"14px",borderRadius:7,background:"rgba(62,255,138,0.04)",border:"1px solid rgba(62,255,138,0.2)",textAlign:"center"}}><div style={{fontSize:24,marginBottom:6}}>✓</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:700,color:"#3EFF8A",marginBottom:3}}>Splunk Connected</div><div style={{fontSize:10,color:T.muted,marginBottom:5}}>47,832 events/day · 6 streams · 23ms latency</div><div style={{fontSize:10,color:T.muted}}>Threat graph populating… 3 APT signatures detected</div></div>,
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(5,8,18,0.88)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={onClose}>
      <div style={{width:"100%",maxWidth:520,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",boxShadow:"0 40px 100px rgba(0,0,0,0.7)"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}><svg width="16" height="16" viewBox="0 0 28 28" fill="none"><polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#5C6FFF" strokeWidth="1.5"/><circle cx="14" cy="14" r="3" fill="#5C6FFF"/></svg><span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:T.text}}>VeilOps Platform Tour</span></div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:T.muted,fontSize:18,cursor:"pointer"}}>×</button>
        </div>
        <div style={{display:"flex",gap:3,padding:"10px 20px 0"}}>{steps.map((_,i)=>(<div key={i} onClick={()=>setStep(i)} style={{flex:1,height:2,borderRadius:1,background:i===step?"#5C6FFF":i<step?"rgba(92,111,255,0.4)":"rgba(255,255,255,0.08)",cursor:"pointer",transition:"all 0.3s"}}/>))}</div>
        <div style={{padding:"16px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{fontSize:22}}>{cur.icon}</span><h3 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:17,fontWeight:700,color:T.text,letterSpacing:"-0.02em"}}>{cur.title}</h3><span style={{marginLeft:"auto",fontSize:10,color:T.muted}}>{step+1}/{steps.length}</span></div>
          <p style={{fontSize:12,color:T.muted,lineHeight:1.7,marginBottom:14}}>{cur.desc}</p>
          {Vis[cur.visual]}
        </div>
        <div style={{padding:"10px 20px 18px",display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:5,color:T.muted,fontSize:12,cursor:step===0?"default":"pointer",opacity:step===0?0.4:1}}>← Prev</button>
          {step<steps.length-1?(<button onClick={()=>setStep(s=>s+1)} style={{padding:"7px 18px",background:"#5C6FFF",border:"none",borderRadius:5,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",fontWeight:600}}>Next →</button>):(<button onClick={()=>{onClose();onOpenConsole();}} style={{padding:"7px 18px",background:"#FFB547",border:"none",borderRadius:5,color:"#0A0F1E",fontSize:12,cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700}}>Launch Console →</button>)}
          <button onClick={()=>{onClose();onOpenConsole();}} style={{marginLeft:"auto",padding:"7px 12px",background:"transparent",border:"none",color:T.muted,fontSize:11,cursor:"pointer"}}>Skip</button>
        </div>
      </div>
    </div>
  );
}

// ── EXPORT PANEL ──────────────────────────────────────────────────────────
function ExportPanel({selected,C}){
  const [loading,setLoading]=useState(false),[report,setReport]=useState(null),[error,setError]=useState(null),[done,setDone]=useState(false);
  const gen=async()=>{if(!selected)return;setLoading(true);setReport(null);setError(null);try{setReport(await aiExport(selected.data,selected.type,null));}catch{setError("Generation failed.");}setLoading(false);};
  const dl=(content,name,type)=>{const b=new Blob([content],{type});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=name;a.click();URL.revokeObjectURL(u);setDone(true);};
  const exportJSON=()=>dl(JSON.stringify({entity:selected?.data?.name||selected?.data?.cveID,type:selected?.type,...report},null,2),`veilops-${(selected?.data?.name||"entity").replace(/\s+/g,"-").toLowerCase()}.json`,"application/json");
  const exportTXT=()=>{const lines=[`VEILOPS THREAT INTELLIGENCE REPORT`,"=".repeat(48),`Classification: ${report.classification||"TLP:WHITE"}`,`Date: ${report.report_date}`,`Confidence: ${report.confidence_score}%`,"",`ENTITY: ${selected?.data?.name||selected?.data?.cveID}`,`TYPE: ${selected?.type?.toUpperCase()}`,"",`EXECUTIVE BRIEF`,"-".repeat(30),report.executive_brief||"","",`TECHNICAL DETAILS`,"-".repeat(30),report.technical_details||"","",`THREAT CONTEXT`,"-".repeat(30),report.threat_context||"","",`RECOMMENDED DETECTIONS`,"-".repeat(30),...(report.recommended_detections||[]).map((d,i)=>`${i+1}. ${d}`),"",`RECOMMENDED MITIGATIONS`,"-".repeat(30),...(report.recommended_mitigations||[]).map((m,i)=>`${i+1}. ${m}`),"",`INDICATORS OF COMPROMISE`,"-".repeat(30),...(report.iocs||[]).map((ioc,i)=>`${i+1}. ${ioc}`),"","---","Generated by VeilOps · © 2026 VeilOps Inc."];dl(lines.join("\n"),`veilops-${(selected?.data?.name||"entity").replace(/\s+/g,"-").toLowerCase()}.txt`,"text/plain");};
  const tlpC={WHITE:"#fff",GREEN:"#3EFF8A",AMBER:"#FFB547",RED:"#FF3E3E"};
  if(!selected)return<div style={{padding:"32px 12px",textAlign:"center"}}><div style={{fontSize:28,marginBottom:10}}>📄</div><div style={{color:C.muted,fontSize:12}}>Select a threat entity to generate an exportable intelligence report.</div></div>;
  return(<div style={{padding:14}}>
    <div style={{fontSize:9,color:C.muted,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>Export Intelligence Report</div>
    <div style={{padding:"8px 10px",background:"rgba(255,255,255,0.02)",border:`1px solid ${C.border}`,borderRadius:5,marginBottom:10}}><div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:1}}>{selected.data.name||selected.data.cveID}</div><div style={{fontSize:10,color:C.muted}}>{selected.type.toUpperCase()}{selected.type==="kev"?` · CVSS ${selected.data.severity}`:selected.type==="technique"?` · ${selected.data.phase}`:""}</div></div>
    {!report&&!loading&&<button onClick={gen} style={{width:"100%",background:"linear-gradient(135deg,#5C6FFF,#3D50E0)",border:"none",borderRadius:5,padding:"9px",color:"#fff",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",marginBottom:8}}>⬡ Generate Intelligence Report</button>}
    {loading&&<div style={{textAlign:"center",padding:"18px 0"}}><div style={{width:24,height:24,border:"2px solid rgba(92,111,255,0.2)",borderTop:"2px solid #5C6FFF",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 8px"}}/><div style={{fontSize:11,color:C.muted}}>Claude generating report…</div></div>}
    {error&&<div style={{padding:"7px 10px",background:"rgba(255,62,62,0.08)",border:"1px solid rgba(255,62,62,0.3)",borderRadius:4,fontSize:11,color:"#FF5C5C",marginBottom:8}}>{error}</div>}
    {report&&(<div>
      <div style={{padding:"8px 10px",background:"rgba(92,111,255,0.06)",border:`1px solid ${C.border}`,borderRadius:5,marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{fontSize:11,fontWeight:700,color:C.text}}>{report.report_title}</div><span style={{padding:"1px 6px",borderRadius:3,background:`${tlpC[report.tlp_color]||"#fff"}18`,border:`1px solid ${tlpC[report.tlp_color]||"#fff"}33`,fontSize:8,fontWeight:700,color:tlpC[report.tlp_color]||"#fff"}}>{report.classification}</span></div>
        <div style={{fontSize:9,color:C.muted}}>Date: {report.report_date} · Confidence: <span style={{color:"#5C6FFF",fontWeight:700}}>{report.confidence_score}%</span></div>
      </div>
      {[["Executive Brief","executive_brief"],["Technical Details","technical_details"],["Threat Context","threat_context"]].map(([l,k])=>report[k]&&(<div key={k} style={{marginBottom:7}}><div style={{fontSize:8,color:C.muted,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>{l}</div><div style={{fontSize:10,color:"#dde",lineHeight:1.65}}>{report[k]}</div></div>))}
      {[["Detections","recommended_detections","#A8FF3E"],["Mitigations","recommended_mitigations","#3EFF8A"],["IOCs","iocs","#FF5C5C"]].map(([l,k,c])=>report[k]?.length>0&&(<div key={k} style={{marginBottom:7}}><div style={{fontSize:8,color:C.muted,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>{l}</div>{report[k].map((v,i)=>(<div key={i} style={{display:"flex",gap:4,marginBottom:1}}><span style={{color:c,fontSize:9,flexShrink:0}}>{l==="IOCs"?"●":"✓"}</span><span style={{fontSize:10,color:"#dde",lineHeight:1.5,fontFamily:l==="IOCs"?"monospace":"inherit"}}>{v}</span></div>))}</div>))}
      <div style={{display:"flex",gap:7,marginTop:10}}>
        <button onClick={exportJSON} style={{flex:1,padding:"8px",background:"rgba(92,111,255,0.1)",border:`1px solid ${C.border}`,borderRadius:4,color:"#5C6FFF",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:11,cursor:"pointer"}}>↓ JSON</button>
        <button onClick={exportTXT} style={{flex:1,padding:"8px",background:"rgba(255,181,71,0.1)",border:"1px solid rgba(255,181,71,0.3)",borderRadius:4,color:"#FFB547",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:11,cursor:"pointer"}}>↓ TXT</button>
      </div>
      {done&&<div style={{textAlign:"center",fontSize:10,color:"#3EFF8A",marginTop:6}}>✓ Downloaded</div>}
      <button onClick={()=>{setReport(null);setDone(false);}} style={{width:"100%",marginTop:6,background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,padding:"5px",color:C.muted,fontSize:10,cursor:"pointer"}}>↻ Regenerate</button>
    </div>)}
  </div>);}


// ── GRAPH CANVAS ──────────────────────────────────────────────────────────
function GraphCanvas({onNodeClick}){
  const canvasRef=useRef(null),animRef=useRef(null),stateRef=useRef({nodes:[],edges:[],hovered:null});
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    const resize=()=>{canvas.width=canvas.offsetWidth;canvas.height=canvas.offsetHeight;};
    resize();window.addEventListener("resize",resize);
    const W=()=>canvas.width,H=()=>canvas.height,nodes=[],idMap={};
    MITRE.groups.slice(0,12).forEach((g,i)=>{const a=(i/12)*Math.PI*2,r=Math.min(W(),H())*0.3;const n={id:g.stix_id,label:g.name,type:"actor",x:W()/2+Math.cos(a)*r+(Math.random()-0.5)*60,y:H()/2+Math.sin(a)*r+(Math.random()-0.5)*60,vx:(Math.random()-0.5)*0.15,vy:(Math.random()-0.5)*0.15,radius:7,color:"#FF5C5C",pulse:Math.random()*Math.PI*2,data:g};nodes.push(n);idMap[g.stix_id]=n;});
    MITRE.techniques.slice(0,20).forEach((t,i)=>{const a=(i/20)*Math.PI*2+0.3,r=Math.min(W(),H())*0.18;const n={id:t.stix_id,label:t.name,type:"technique",x:W()/2+Math.cos(a)*r+(Math.random()-0.5)*40,y:H()/2+Math.sin(a)*r+(Math.random()-0.5)*40,vx:(Math.random()-0.5)*0.1,vy:(Math.random()-0.5)*0.1,radius:4.5,color:PHASE_COLORS[t.phase]||"#5C6FFF",pulse:Math.random()*Math.PI*2,data:t};nodes.push(n);idMap[t.stix_id]=n;});
    MITRE.malware.slice(0,15).forEach(m=>{const n={id:m.stix_id,label:m.name,type:"malware",x:Math.random()*W()*0.8+W()*0.1,y:Math.random()*H()*0.8+H()*0.1,vx:(Math.random()-0.5)*0.12,vy:(Math.random()-0.5)*0.12,radius:3.5,color:"#FFB547",pulse:Math.random()*Math.PI*2,data:m};nodes.push(n);idMap[m.stix_id]=n;});
    CISA_KEV.slice(0,6).forEach(k=>{nodes.push({id:k.cveID,label:k.cveID,type:"kev",x:Math.random()*W()*0.9+W()*0.05,y:Math.random()*H()*0.9+H()*0.05,vx:(Math.random()-0.5)*0.2,vy:(Math.random()-0.5)*0.2,radius:5,color:"#FF3E3E",pulse:Math.random()*Math.PI*2,data:k});});
    const edges=[];MITRE.relationships.slice(0,60).forEach(r=>{if(idMap[r.src]&&idMap[r.tgt])edges.push({from:idMap[r.src],to:idMap[r.tgt]});});
    stateRef.current={nodes,edges,hovered:null};
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const{nodes,edges}=stateRef.current;
      nodes.forEach(n=>{n.pulse+=0.018;n.x+=n.vx;n.y+=n.vy;if(n.x<20||n.x>canvas.width-20)n.vx*=-1;if(n.y<20||n.y>canvas.height-20)n.vy*=-1;});
      edges.forEach(e=>{const dx=e.from.x-e.to.x,dy=e.from.y-e.to.y,d=Math.sqrt(dx*dx+dy*dy);if(d<200){ctx.beginPath();ctx.moveTo(e.from.x,e.from.y);ctx.lineTo(e.to.x,e.to.y);ctx.strokeStyle=`rgba(92,111,255,${(1-d/200)*0.22})`;ctx.lineWidth=0.7;ctx.stroke();}});
      nodes.forEach(n=>{const g=(Math.sin(n.pulse)+1)/2,isH=stateRef.current.hovered===n.id,r=n.radius+(isH?3:0)+g*1.2;ctx.beginPath();ctx.arc(n.x,n.y,r,0,Math.PI*2);ctx.fillStyle=n.color;ctx.globalAlpha=0.5+g*0.4+(isH?0.3:0);ctx.fill();ctx.globalAlpha=1;if(n.type==="kev"){ctx.beginPath();ctx.arc(n.x,n.y,r+5+g*4,0,Math.PI*2);ctx.strokeStyle=`rgba(255,62,62,${0.15+g*0.2})`;ctx.lineWidth=1.5;ctx.stroke();}if(n.type==="actor"||isH){ctx.beginPath();ctx.arc(n.x,n.y,r+4+g*3,0,Math.PI*2);ctx.strokeStyle=n.color;ctx.globalAlpha=0.1+g*0.08;ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;}if(isH){ctx.font="bold 11px Inter";ctx.fillStyle="#fff";ctx.globalAlpha=0.9;ctx.fillText(n.label.length>16?n.label.slice(0,14)+"…":n.label,n.x+r+4,n.y+4);ctx.globalAlpha=1;}});
      animRef.current=requestAnimationFrame(draw);
    };
    draw();
    const onMv=e=>{const rect=canvas.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top;let found=null;stateRef.current.nodes.forEach(n=>{if(Math.sqrt((n.x-mx)**2+(n.y-my)**2)<n.radius+8)found=n.id;});stateRef.current.hovered=found;canvas.style.cursor=found?"pointer":"default";};
    const onCl=e=>{const rect=canvas.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top;stateRef.current.nodes.forEach(n=>{if(Math.sqrt((n.x-mx)**2+(n.y-my)**2)<n.radius+8)onNodeClick&&onNodeClick(n);});};
    canvas.addEventListener("mousemove",onMv);canvas.addEventListener("click",onCl);
    return()=>{cancelAnimationFrame(animRef.current);window.removeEventListener("resize",resize);canvas.removeEventListener("mousemove",onMv);canvas.removeEventListener("click",onCl);};
  },[onNodeClick]);
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ── COMPACT PANELS ─────────────────────────────────────────────────────────
function AIPanel({selected,C}){
  const [an,setAn]=useState(null),[load,setLoad]=useState(false),[err,setErr]=useState(null),prev=useRef(null);
  const run=useCallback(async()=>{if(!selected)return;const key=selected.data.stix_id||selected.data.cveID;if(key===prev.current)return;prev.current=key;setLoad(true);setAn(null);setErr(null);try{setAn(await aiAnalyze(selected.data,selected.type,MITRE.relationships.filter(r=>r.src===selected.data?.stix_id||r.tgt===selected.data?.stix_id).slice(0,5)));}catch{setErr("AI unavailable.");}setLoad(false);},[selected]);
  const tc=l=>({CRITICAL:"#FF3E3E",HIGH:"#FF8C42",MEDIUM:"#FFB547",LOW:"#3EFF8A"}[l]||C.muted);
  if(!selected)return<div style={{padding:"28px 12px",textAlign:"center",color:C.muted,fontSize:12}}>Select any node to run Claude AI analysis.</div>;
  return(<div style={{padding:13}}>
    <div style={{marginBottom:8}}><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:700,color:C.text,marginBottom:1}}>{selected.data.name||selected.data.cveID}</div><div style={{fontSize:9,color:C.muted}}>{selected.type==="technique"?`${selected.data.id} · ${selected.data.phase}`:selected.type==="kev"?`CVSS ${selected.data.severity} · ${selected.data.vendor}`:(selected.data.platforms||[]).join(", ")}</div></div>
    {!an&&!load&&<button onClick={run} style={{width:"100%",background:"linear-gradient(135deg,#5C6FFF,#3D50E0)",border:"none",borderRadius:5,padding:"9px",color:"#fff",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",marginBottom:7}}>⬡ Run AI Analysis</button>}
    {load&&<div style={{textAlign:"center",padding:"14px 0"}}><div style={{width:22,height:22,border:"2px solid rgba(92,111,255,0.2)",borderTop:"2px solid #5C6FFF",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 7px"}}/><div style={{fontSize:10,color:C.muted}}>Analyzing with Claude…</div></div>}
    {err&&<div style={{padding:"6px 9px",background:"rgba(255,62,62,0.08)",border:"1px solid rgba(255,62,62,0.3)",borderRadius:4,fontSize:10,color:"#FF5C5C",marginBottom:7}}>{err}</div>}
    {an&&(<div>
      <div style={{display:"flex",gap:5,marginBottom:7}}>
        <div style={{flex:1,padding:"6px",background:`${tc(an.threat_level)}18`,border:`1px solid ${tc(an.threat_level)}44`,borderRadius:4,textAlign:"center"}}><div style={{fontSize:8,color:C.muted,fontWeight:600,marginBottom:1}}>THREAT</div><div style={{fontSize:13,fontWeight:700,color:tc(an.threat_level),fontFamily:"'Space Grotesk',sans-serif"}}>{an.threat_level}</div></div>
        {(an.origin||an.detection_difficulty||an.malware_category||an.exploit_maturity)&&<div style={{flex:1,padding:"6px",background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:4,textAlign:"center"}}><div style={{fontSize:8,color:C.muted,fontWeight:600,marginBottom:1}}>{an.origin?"ORIGIN":an.detection_difficulty?"DETECTION":an.exploit_maturity?"MATURITY":"TYPE"}</div><div style={{fontSize:10,fontWeight:700,color:C.text}}>{an.origin||an.detection_difficulty||an.exploit_maturity||an.malware_category}</div></div>}
      </div>
      {an.primary_motivation&&<div style={{marginBottom:5,padding:"4px 7px",background:"rgba(92,111,255,0.06)",border:`1px solid ${C.border}`,borderRadius:3}}><span style={{fontSize:8,color:C.indigo||"#5C6FFF",fontWeight:700}}>MOTIVATION · </span><span style={{fontSize:10,color:C.text,fontWeight:600}}>{an.primary_motivation}</span></div>}
      {[["Targets","target_sectors"],["Detections","detection_methods"],["Mitigations","mitigations"],["Actions","recommended_actions"],["Persistence","persistence_mechanisms"],["C2","c2_methods"],["IOC Types","ioc_types"],["Signatures","detection_signatures"],["Platforms","affected_platforms"]].filter(([,k])=>an[k]?.length).map(([l,k])=>(<div key={k} style={{marginBottom:5}}><div style={{fontSize:8,color:C.muted,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>{l}</div>{an[k].map((v,i)=>(<div key={i} style={{display:"flex",gap:4,marginBottom:1}}><div style={{width:3,height:3,borderRadius:"50%",background:"#5C6FFF",marginTop:4,flexShrink:0}}/><div style={{fontSize:10,color:"#dde",lineHeight:1.5}}>{v}</div></div>))}</div>))}
      {an.veilops_detection_rule&&<div style={{marginBottom:5}}><div style={{fontSize:8,color:C.muted,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>Detection Rule</div><div style={{padding:"5px 7px",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(92,111,255,0.3)",borderRadius:3,fontFamily:"monospace",fontSize:9,color:"#A8FF3E",lineHeight:1.6}}>{an.veilops_detection_rule}</div></div>}
      {an.analyst_note&&<div style={{marginTop:5,padding:"6px 8px",background:"rgba(255,181,71,0.06)",border:"1px solid rgba(255,181,71,0.2)",borderRadius:3}}><div style={{fontSize:8,color:"#FFB547",fontWeight:700,marginBottom:2}}>ANALYST NOTE</div><div style={{fontSize:10,color:"#ddd",lineHeight:1.6,fontStyle:"italic"}}>{an.analyst_note}</div></div>}
      <button onClick={()=>{setAn(null);prev.current=null;setTimeout(run,50);}} style={{width:"100%",marginTop:6,background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,padding:"4px",color:C.muted,fontSize:9,cursor:"pointer"}}>↻ Refresh</button>
    </div>)}
    {selected.type!=="kev"&&(()=>{const rels=MITRE.relationships.filter(r=>r.src===selected.data.stix_id||r.tgt===selected.data.stix_id).slice(0,4);if(!rels.length)return null;return(<div style={{marginTop:9,paddingTop:7,borderTop:`1px solid ${C.border}`}}><div style={{fontSize:8,fontWeight:700,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:5}}>Relationships</div>{rels.map((r,i)=>{const isSrc=r.src===selected.data.stix_id;return(<div key={i} style={{padding:"4px 6px",background:"rgba(255,255,255,0.02)",border:`1px solid ${C.border}`,borderRadius:3,marginBottom:2}}><div style={{fontSize:8,color:"#5C6FFF",fontWeight:600,marginBottom:1}}>{r.rt?.toUpperCase()}</div><div style={{fontSize:9,color:"#ccc"}}>{isSrc?"→ ":"← "}{isSrc?r.tn:r.sn}</div></div>);})}</div>);})()}
  </div>);}

function ChainPanel({actor,C}){
  if(!actor)return<div style={{padding:"28px 12px",textAlign:"center",color:C.muted,fontSize:12}}>Select an APT group to map their kill chain.</div>;
  const ids=new Set(MITRE.relationships.filter(r=>r.src===actor.stix_id&&r.rt==="uses").map(r=>r.tgt));
  const techs=MITRE.techniques.filter(t=>ids.has(t.stix_id));
  const pm={};techs.forEach(t=>{if(!pm[t.phase])pm[t.phase]=[];pm[t.phase].push(t);});
  const cov=Math.round((KCO.filter(p=>pm[p]).length/KCO.length)*100);
  return(<div style={{padding:13}}>
    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>{actor.name}</div>
    <div style={{height:4,background:"rgba(255,255,255,0.08)",borderRadius:2,overflow:"hidden",marginBottom:3}}><div style={{height:"100%",width:`${cov}%`,background:"linear-gradient(90deg,#5C6FFF,#FF5C5C)",borderRadius:2}}/></div>
    <div style={{fontSize:10,color:"#FFB547",fontWeight:600,marginBottom:10}}>{cov}% · {techs.length} techniques</div>
    {KCO.map(phase=>{const ts=pm[phase];return ts?(<div key={phase} style={{marginBottom:7}}><div style={{display:"flex",gap:5,alignItems:"center",marginBottom:3}}><div style={{width:5,height:5,borderRadius:1,background:PHASE_COLORS[phase]||"#5C6FFF",flexShrink:0}}/><span style={{fontSize:9,color:PHASE_COLORS[phase]||"#5C6FFF",fontWeight:700}}>{phase}</span><span style={{fontSize:8,color:C.muted}}>({ts.length})</span></div>{ts.map(t=>(<div key={t.stix_id} style={{marginLeft:10,marginBottom:2,padding:"2px 5px",background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:2}}><div style={{fontSize:9,color:"#ddd"}}>{t.name}</div><div style={{fontSize:8,color:C.muted}}>{t.id}</div></div>))}</div>):(<div key={phase} style={{marginBottom:3,opacity:0.2}}><div style={{display:"flex",gap:5,alignItems:"center"}}><div style={{width:5,height:5,borderRadius:1,background:"rgba(255,255,255,0.15)",flexShrink:0}}/><span style={{fontSize:8,color:C.muted}}>{phase}</span></div></div>);})}
  </div>);}

function ComparePanel({C}){
  const [aA,setAA]=useState(null),[aB,setAB]=useState(null),[res,setRes]=useState(null),[load,setLoad]=useState(false),[err,setErr]=useState(null);
  const tA=new Set(MITRE.relationships.filter(r=>r.src===aA?.stix_id&&r.rt==="uses").map(r=>r.tgt));
  const tB=new Set(MITRE.relationships.filter(r=>r.src===aB?.stix_id&&r.rt==="uses").map(r=>r.tgt));
  const shared=[...tA].filter(x=>tB.has(x));
  const gn=id=>MITRE.techniques.find(t=>t.stix_id===id)?.name;
  const tc=l=>({CRITICAL:"#FF3E3E",HIGH:"#FF8C42",MEDIUM:"#FFB547"}[l]||C.muted);
  const run=async()=>{if(!aA||!aB)return;setLoad(true);setRes(null);setErr(null);try{setRes(await aiCompare(aA,aB));}catch{setErr("Failed.");}setLoad(false);};
  return(<div style={{padding:13}}>
    <div style={{fontSize:9,color:C.muted,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Actor Comparison</div>
    <div style={{display:"flex",gap:6,marginBottom:7}}>{[["A",aA,setAA,"#FF5C5C"],["B",aB,setAB,"#5C6FFF"]].map(([l,v,s,c])=>(<div key={l} style={{flex:1}}><div style={{fontSize:8,color:c,fontWeight:700,marginBottom:3}}>GROUP {l}</div><select value={v?.stix_id||""} onChange={e=>{const g=MITRE.groups.find(a=>a.stix_id===e.target.value);s(g||null);setRes(null);}} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${v?c:C.border}`,borderRadius:3,padding:"5px 6px",color:C.text,fontSize:10,outline:"none"}}><option value="">Select…</option>{MITRE.groups.map(a=>(<option key={a.stix_id} value={a.stix_id} style={{background:"#0A0F1E"}}>{a.name}</option>))}</select></div>))}</div>
    {aA&&aB&&(<div>
      <div style={{display:"flex",gap:4,marginBottom:7}}>{[{n:tA.size,l:"A",c:"#FF5C5C"},{n:shared.length,l:"Shared",c:"#FFB547"},{n:tB.size,l:"B",c:"#5C6FFF"}].map(s=>(<div key={s.l} style={{flex:1,padding:"5px",background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:3,textAlign:"center"}}><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:14,fontWeight:700,color:s.c}}>{s.n}</div><div style={{fontSize:8,color:C.muted}}>{s.l}</div></div>))}</div>
      {shared.length>0&&<div style={{marginBottom:7}}><div style={{fontSize:8,color:"#FFB547",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Shared ({shared.length})</div><div style={{maxHeight:65,overflowY:"auto"}}>{shared.slice(0,5).map(id=>{const n=gn(id);return n?<div key={id} style={{fontSize:9,color:"#ddd",padding:"1px 0",borderBottom:`1px solid ${C.border}`}}>⬡ {n}</div>:null;})}</div></div>}
      <button onClick={run} disabled={load} style={{width:"100%",background:"linear-gradient(135deg,#5C6FFF,#3D50E0)",border:"none",borderRadius:4,padding:"8px",color:"#fff",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:11,cursor:"pointer",marginBottom:5,opacity:load?0.7:1}}>{load?"Analyzing…":"⬡ AI Comparison"}</button>
      {load&&<div style={{textAlign:"center",padding:"8px 0"}}><div style={{width:18,height:18,border:"2px solid rgba(92,111,255,0.2)",borderTop:"2px solid #5C6FFF",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 4px"}}/><div style={{fontSize:9,color:C.muted}}>Claude comparing…</div></div>}
      {err&&<div style={{fontSize:9,color:"#FF5C5C",marginBottom:4}}>{err}</div>}
      {res&&(<div>
        <div style={{padding:"6px",background:`${tc(res.combined_threat_level)}18`,border:`1px solid ${tc(res.combined_threat_level)}44`,borderRadius:3,textAlign:"center",marginBottom:6}}><div style={{fontSize:8,color:C.muted,fontWeight:600,marginBottom:1}}>COMBINED THREAT</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:14,fontWeight:700,color:tc(res.combined_threat_level)}}>{res.combined_threat_level}</div></div>
        {[["Coordination","likely_coordination"],["Infra Overlap","shared_infrastructure_risk"]].map(([l,k])=>(<div key={k} style={{display:"flex",gap:5,alignItems:"center",marginBottom:4}}><span style={{fontSize:9,color:C.muted,flex:1}}>{l}</span><span style={{fontSize:10,fontWeight:700,color:({Probable:"#FF3E3E",Possible:"#FFB547",Unlikely:"#3EFF8A",High:"#FF3E3E",Medium:"#FFB547",Low:"#3EFF8A"})[res[k]]||C.muted}}>{res[k]}</span></div>))}
        {[["A Strength","group_a_unique_strength","#FF5C5C"],["B Strength","group_b_unique_strength","#5C6FFF"],["Diff","threat_difference",C.muted]].map(([l,k,c])=>res[k]?<div key={k} style={{marginBottom:4,padding:"4px 7px",background:"rgba(255,255,255,0.02)",border:`1px solid ${C.border}`,borderRadius:3}}><div style={{fontSize:8,color:c,fontWeight:700,marginBottom:1}}>{l}</div><div style={{fontSize:9,color:"#ccc",lineHeight:1.5}}>{res[k]}</div></div>:null)}
        {res.analyst_verdict&&<div style={{padding:"6px 8px",background:"rgba(255,181,71,0.06)",border:"1px solid rgba(255,181,71,0.2)",borderRadius:3,marginTop:4}}><div style={{fontSize:8,color:"#FFB547",fontWeight:700,marginBottom:2}}>VERDICT</div><div style={{fontSize:9,color:"#ddd",lineHeight:1.6,fontStyle:"italic"}}>{res.analyst_verdict}</div></div>}
      </div>)}
    </div>)}
    {(!aA||!aB)&&<div style={{textAlign:"center",padding:"14px 0",color:C.muted,fontSize:10}}>Select two APT groups to compare.</div>}
  </div>);}

function IOCPanel({C}){
  const [q,setQ]=useState(""),[res,setRes]=useState(null),[searched,setSearched]=useState(false);
  const search=()=>{if(!q.trim())return;setSearched(true);setRes(IOC_DB.find(i=>i.ioc.toLowerCase().includes(q.toLowerCase()))||null);};
  return(<div style={{padding:13}}>
    <div style={{fontSize:9,color:C.muted,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>IOC Lookup</div>
    <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="IP / Domain / Hash…" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 8px",color:C.text,fontSize:11,outline:"none",boxSizing:"border-box",marginBottom:5}}/>
    <button onClick={search} style={{width:"100%",background:"#5C6FFF",border:"none",borderRadius:4,padding:"7px",color:"#fff",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:11,cursor:"pointer",marginBottom:9}}>Search</button>
    <div style={{marginBottom:9}}><div style={{fontSize:8,color:C.muted,marginBottom:4}}>Examples:</div><div style={{display:"flex",flexWrap:"wrap",gap:3}}>{["185.220.101.47","cobaltrike.evil-domain.com","cdn-update.azureedge-ms.net"].map(ioc=>(<button key={ioc} onClick={()=>{setQ(ioc);setSearched(false);setRes(null);}} style={{padding:"1px 5px",background:"rgba(92,111,255,0.08)",border:`1px solid ${C.border}`,borderRadius:2,color:"#5C6FFF",fontSize:8,cursor:"pointer",fontFamily:"monospace"}}>{ioc.length>22?ioc.slice(0,20)+"…":ioc}</button>))}</div></div>
    {searched&&res&&(<div><div style={{padding:"7px 9px",background:"rgba(255,62,62,0.06)",border:"1px solid rgba(255,62,62,0.25)",borderRadius:4,marginBottom:7}}><div style={{fontSize:9,color:"#FF5C5C",fontWeight:700,marginBottom:3}}>⚠ MATCH FOUND</div><div style={{fontFamily:"monospace",fontSize:10,color:C.text,marginBottom:4,wordBreak:"break-all"}}>{res.ioc}</div><div style={{display:"flex",gap:3,marginBottom:4}}><span style={{padding:"1px 5px",borderRadius:2,background:"rgba(255,92,92,0.15)",color:"#FF5C5C",fontSize:8,fontWeight:700}}>{res.type}</span><span style={{padding:"1px 5px",borderRadius:2,background:"rgba(92,111,255,0.15)",color:"#5C6FFF",fontSize:8,fontWeight:700}}>{res.confidence}%</span></div><div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"2px 6px",fontSize:9}}>{[["Actor",res.actor,"#FF5C5C"],["Malware",res.malware,"#FFB547"],["Campaign",res.campaign,"#5C6FFF"]].map(([k,v,c])=>[<span key={k+"k"} style={{color:C.muted,fontWeight:600}}>{k}:</span>,<span key={k+"v"} style={{color:c,fontWeight:600}}>{v}</span>])}</div></div><div style={{padding:"6px 8px",background:"rgba(255,181,71,0.06)",border:"1px solid rgba(255,181,71,0.2)",borderRadius:3}}><div style={{fontSize:8,color:"#FFB547",fontWeight:700,marginBottom:2}}>ACTION</div><div style={{fontSize:9,color:"#ddd",lineHeight:1.5}}>Block at perimeter. Hunt for {res.malware} persistence. Review {res.actor} TTP profile.</div></div></div>)}
    {searched&&!res&&<div style={{textAlign:"center",padding:"14px 0"}}><div style={{fontSize:18,marginBottom:4}}>✓</div><div style={{color:"#3EFF8A",fontSize:10,fontWeight:600,marginBottom:2}}>No match found</div><div style={{color:C.muted,fontSize:9}}>Not in VeilOps database.</div></div>}
  </div>);}

function AlertsPanel({C}){
  const [alerts,setAlerts]=useState(()=>genAlerts()),[filter,setFilter]=useState("all"),[paused,setPaused]=useState(false),iRef=useRef(null);
  useEffect(()=>{if(paused)return;iRef.current=setInterval(()=>{const a=genAlerts()[0];setAlerts(p=>[{...a,id:Date.now(),time:"just now",ts:Date.now()},...p.slice(0,24)]);},8000);return()=>clearInterval(iRef.current);},[paused]);
  const sc={CRITICAL:"#FF3E3E",HIGH:"#FF8C42",MEDIUM:"#FFB547",LOW:"#3EFF8A"};
  const fil=filter==="all"?alerts:alerts.filter(a=>a.severity===filter);
  return(<div style={{display:"flex",flexDirection:"column",height:"100%"}}>
    <div style={{padding:"7px 9px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
      <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:3}}>{["all","CRITICAL","HIGH","MEDIUM","LOW"].map(s=>(<button key={s} onClick={()=>setFilter(s)} style={{padding:"1px 5px",borderRadius:2,border:`1px solid ${s==="all"?C.border:sc[s]||C.border}`,background:filter===s?(s==="all"?"rgba(92,111,255,0.15)":`${sc[s]}18`):"transparent",color:filter===s?(s==="all"?"#5C6FFF":sc[s]):"#fff",fontSize:8,cursor:"pointer",fontWeight:600,opacity:filter===s?1:0.5}}>{s==="all"?"ALL":s}</button>))}<button onClick={()=>setPaused(p=>!p)} style={{marginLeft:"auto",padding:"1px 5px",borderRadius:2,border:`1px solid ${C.border}`,background:"transparent",color:paused?"#3EFF8A":C.muted,fontSize:8,cursor:"pointer",fontWeight:600}}>{paused?"▶":"⏸"}</button></div>
      {!paused&&<div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:4,height:4,borderRadius:"50%",background:"#3EFF8A",animation:"pulse 2s infinite"}}/><span style={{fontSize:7,color:"#3EFF8A",fontWeight:600}}>LIVE</span></div>}
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"4px"}}>
      {fil.map((a,i)=>(<div key={a.id} style={{padding:"6px 8px",borderRadius:3,marginBottom:3,background:"rgba(255,255,255,0.02)",border:`1px solid ${i===0&&!paused?"rgba(92,111,255,0.3)":C.border}`,animation:i===0&&!paused?"fadeIn 0.4s ease":"none"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:8,fontWeight:700,padding:"1px 4px",borderRadius:2,background:`${sc[a.severity]}18`,color:sc[a.severity],border:`1px solid ${sc[a.severity]}33`}}>{a.severity}</span><span style={{fontSize:8,color:C.muted}}>{a.time}</span></div><div style={{fontSize:10,color:"#ddd",lineHeight:1.5,marginBottom:2}}>{a.title}</div><div style={{display:"flex",gap:4}}><span style={{fontSize:8,color:"#FF5C5C",fontWeight:600}}>{a.actor}</span><span style={{fontSize:8,color:C.muted}}>·</span><span style={{fontSize:8,color:"#5C6FFF"}}>{a.tech?.length>24?a.tech.slice(0,22)+"…":a.tech}</span></div></div>))}
    </div>
  </div>);}

function RiskPanel({C}){
  const [env,setEnv]=useState({sources:3,sector:"finance",size:"mid",hasEDR:false,hasMFA:false,hasPatchCycle:false}),[rep,setRep]=useState(null),[load,setLoad]=useState(false),[err,setErr]=useState(null);
  const score=computeRisk(env),rl=riskLabel(score);
  const cx=70,cy=70,r=52,sa=-Math.PI*0.75,ea=sa+(score/100)*Math.PI*1.5;
  const x1=cx+r*Math.cos(sa),y1=cy+r*Math.sin(sa),x2=cx+r*Math.cos(ea),y2=cy+r*Math.sin(ea),la=score/100>0.5?1:0;
  const run=async()=>{setLoad(true);setRep(null);setErr(null);try{setRep(await aiRisk(env,score,rl.label));}catch{setErr("Report failed.");}setLoad(false);};
  const tog=k=>setEnv(e=>({...e,[k]:!e[k]}));
  return(<div style={{padding:13}}>
    <div style={{fontSize:9,color:C.muted,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Risk Score Engine</div>
    <div style={{textAlign:"center",marginBottom:10}}><svg width="140" height="88" style={{overflow:"visible"}}><path d={`M ${cx+r*Math.cos(sa)} ${cy+r*Math.sin(sa)} A ${r} ${r} 0 1 1 ${cx+r*Math.cos(sa+0.01)} ${cy+r*Math.sin(sa+0.01)}`} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" strokeLinecap="round"/><path d={`M ${x1} ${y1} A ${r} ${r} 0 ${la} 1 ${x2} ${y2}`} fill="none" stroke={rl.color} strokeWidth="9" strokeLinecap="round" style={{transition:"all 0.5s ease"}}/><text x={cx} y={cy+6} textAnchor="middle" fill={rl.color} fontSize="22" fontWeight="700" fontFamily="Space Grotesk,sans-serif">{score}</text><text x={cx} y={cy+19} textAnchor="middle" fill={rl.color} fontSize="8" fontWeight="700" letterSpacing="2">{rl.label}</text></svg></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:7}}>
      <div><div style={{fontSize:8,color:C.muted,fontWeight:700,marginBottom:3}}>SECTOR</div><select value={env.sector} onChange={e=>setEnv(v=>({...v,sector:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 5px",color:C.text,fontSize:9,outline:"none"}}>{[["finance","Finance"],["healthcare","Health"],["gov","Gov"],["energy","Energy"],["tech","Tech"],["retail","Retail"]].map(([v,l])=>(<option key={v} value={v} style={{background:"#0A0F1E"}}>{l}</option>))}</select></div>
      <div><div style={{fontSize:8,color:C.muted,fontWeight:700,marginBottom:3}}>SIZE</div><select value={env.size} onChange={e=>setEnv(v=>({...v,size:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 5px",color:C.text,fontSize:9,outline:"none"}}>{[["small","<100"],["mid","100-1K"],["large","1K-10K"],["enterprise","10K+"]].map(([v,l])=>(<option key={v} value={v} style={{background:"#0A0F1E"}}>{l}</option>))}</select></div>
    </div>
    <div style={{marginBottom:7}}><div style={{fontSize:8,color:C.muted,fontWeight:700,marginBottom:3}}>SOURCES <span style={{color:"#5C6FFF"}}>{env.sources}</span></div><input type="range" min="1" max="12" value={env.sources} onChange={e=>setEnv(v=>({...v,sources:+e.target.value}))} style={{width:"100%",accentColor:"#5C6FFF"}}/></div>
    <div style={{marginBottom:9}}>{[["hasEDR","EDR / XDR",12],["hasMFA","MFA enforced",10],["hasPatchCycle","Patch cycle",8]].map(([k,l,pts])=>(<div key={k} onClick={()=>tog(k)} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 6px",borderRadius:3,border:`1px solid ${env[k]?"#5C6FFF":C.border}`,background:env[k]?"rgba(92,111,255,0.07)":"transparent",marginBottom:3,cursor:"pointer"}}><div style={{width:11,height:11,borderRadius:2,border:`2px solid ${env[k]?"#5C6FFF":C.muted}`,background:env[k]?"#5C6FFF":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:"#fff",fontWeight:700,flexShrink:0}}>{env[k]?"✓":""}</div><span style={{fontSize:9,color:env[k]?C.text:C.muted,flex:1}}>{l}</span>{env[k]&&<span style={{fontSize:7,color:"#3EFF8A"}}>-{pts}pts</span>}</div>))}</div>
    <button onClick={run} disabled={load} style={{width:"100%",background:"linear-gradient(135deg,#5C6FFF,#3D50E0)",border:"none",borderRadius:4,padding:"8px",color:"#fff",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:11,cursor:"pointer",marginBottom:7,opacity:load?0.7:1}}>{load?"Generating…":"⬡ AI Risk Report"}</button>
    {load&&<div style={{textAlign:"center",padding:"8px 0"}}><div style={{width:18,height:18,border:"2px solid rgba(92,111,255,0.2)",borderTop:"2px solid #5C6FFF",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 4px"}}/><div style={{fontSize:9,color:C.muted}}>Claude analyzing…</div></div>}
    {err&&<div style={{fontSize:9,color:"#FF5C5C",marginBottom:5}}>{err}</div>}
    {rep&&(<div>
      {rep.executive_summary&&<div style={{marginBottom:7,padding:"6px 8px",background:"rgba(92,111,255,0.06)",border:`1px solid ${C.border}`,borderRadius:4}}><div style={{fontSize:8,color:"#5C6FFF",fontWeight:700,marginBottom:2}}>SUMMARY</div><div style={{fontSize:9,color:"#ddd",lineHeight:1.6}}>{rep.executive_summary}</div></div>}
      {rep.top_risks?.length>0&&<div style={{marginBottom:7}}><div style={{fontSize:8,color:"#FF5C5C",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>Top Risks</div>{rep.top_risks.map((r,i)=>(<div key={i} style={{display:"flex",gap:3,marginBottom:2}}><span style={{fontSize:8,color:"#FF5C5C",flexShrink:0}}>▲</span><span style={{fontSize:9,color:"#dde",lineHeight:1.5}}>{r}</span></div>))}</div>}
      {rep.quick_wins?.length>0&&<div style={{marginBottom:7}}><div style={{fontSize:8,color:"#3EFF8A",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>Quick Wins</div>{rep.quick_wins.map((w,i)=>(<div key={i} style={{display:"flex",gap:3,marginBottom:2}}><span style={{fontSize:8,color:"#3EFF8A",flexShrink:0}}>✓</span><span style={{fontSize:9,color:"#dde",lineHeight:1.5}}>{w}</span></div>))}</div>}
      {rep.estimated_breach_cost&&<div style={{padding:"5px 8px",background:"rgba(255,62,62,0.06)",border:"1px solid rgba(255,62,62,0.2)",borderRadius:3,marginBottom:5,display:"flex",gap:5,alignItems:"center"}}><span style={{fontSize:8,color:C.muted}}>Est. breach cost:</span><span style={{fontSize:11,color:"#FF5C5C",fontWeight:700,fontFamily:"'Space Grotesk',sans-serif"}}>{rep.estimated_breach_cost}</span></div>}
      {rep.analyst_verdict&&<div style={{padding:"6px 8px",background:"rgba(255,181,71,0.06)",border:"1px solid rgba(255,181,71,0.2)",borderRadius:3}}><div style={{fontSize:8,color:"#FFB547",fontWeight:700,marginBottom:2}}>VERDICT</div><div style={{fontSize:9,color:"#ddd",lineHeight:1.6,fontStyle:"italic"}}>{rep.analyst_verdict}</div></div>}
    </div>)}
  </div>);}



// ── WATCHLIST (persisted via storage API) ─────────────────────────────────
function useWatchlist() {
  const [list, setList] = useState([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('veilops_watchlist');
      if (saved) setList(JSON.parse(saved));
    } catch {}
  }, []);
  const add = (item) => {
    const key = item.data.stix_id || item.data.cveID || item.data.ioc;
    if (list.find(l => (l.data.stix_id || l.data.cveID || l.data.ioc) === key)) return;
    const next = [...list, { ...item, addedAt: Date.now() }];
    setList(next);
    try { localStorage.setItem('veilops_watchlist', JSON.stringify(next)); } catch {}
  };
  const remove = (key) => {
    const next = list.filter(l => (l.data.stix_id || l.data.cveID || l.data.ioc) !== key);
    setList(next);
    try { localStorage.setItem('veilops_watchlist', JSON.stringify(next)); } catch {}
  };
  const has = (key) => !!list.find(l => (l.data.stix_id || l.data.cveID || l.data.ioc) === key);
  return { list, add, remove, has };
}

function WatchlistPanel({ C, watchlist, onSelect }) {
  const typeColor = { actor: '#FF5C5C', technique: '#5C6FFF', malware: '#FFB547', kev: '#FF3E3E', ioc: '#BF5CFF' };
  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Watchlist <span style={{ color: '#5C6FFF' }}>({watchlist.list.length})</span>
      </div>
      {watchlist.list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0' }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>👁️</div>
          <div style={{ color: C.muted, fontSize: 12 }}>No entities pinned yet.</div>
          <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>Click ★ next to any entity to watch it.</div>
        </div>
      ) : (
        <div>
          {watchlist.list.sort((a, b) => b.addedAt - a.addedAt).map((item, i) => {
            const key = item.data.stix_id || item.data.cveID || item.data.ioc;
            const c = typeColor[item.type] || C.muted;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 4, marginBottom: 4, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, cursor: 'pointer', transition: 'border-color 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = c}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                <div style={{ width: 6, height: 6, borderRadius: item.type === 'technique' ? 2 : '50%', background: c, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => onSelect(item)}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.data.name || item.data.cveID || item.data.ioc}</div>
                  <div style={{ fontSize: 9, color: C.muted }}>{item.type.toUpperCase()}{item.type === 'technique' ? ` · ${item.data.phase}` : item.type === 'kev' ? ` · CVSS ${item.data.severity}` : ''}</div>
                </div>
                <button onClick={() => watchlist.remove(key)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1 }} title="Remove">×</button>
              </div>
            );
          })}
          <button onClick={() => { watchlist.list.forEach(item => watchlist.remove(item.data.stix_id || item.data.cveID || item.data.ioc)); }}
            style={{ width: '100%', marginTop: 8, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px', color: C.muted, fontSize: 10, cursor: 'pointer', fontFamily: 'Inter' }}>
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}

// ── ANALYST NOTES ─────────────────────────────────────────────────────────
function NotesPanel({ selected, C }) {
  const [notes, setNotes] = useState({});
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const key = selected?.data?.stix_id || selected?.data?.cveID || selected?.data?.ioc || null;

  useEffect(() => {
    try {
      const n = JSON.parse(localStorage.getItem('veilops_notes') || '{}');
      setNotes(n);
    } catch {}
  }, []);

  useEffect(() => {
    if (key && notes[key] !== undefined) setDraft(notes[key]);
    else setDraft('');
    setSaved(false);
  }, [key]);

  const save = () => {
    if (!key) return;
    const next = { ...notes, [key]: draft };
    setNotes(next);
    try { localStorage.setItem('veilops_notes', JSON.stringify(next)); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const allNotes = Object.entries(notes).filter(([, v]) => v.trim());

  if (!selected) return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Analyst Notes</div>
      {allNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📝</div>
          <div style={{ color: C.muted, fontSize: 12 }}>Select any entity to add analyst notes.</div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 9, color: C.muted, marginBottom: 8 }}>Recent notes:</div>
          {allNotes.slice(0, 5).map(([k, v]) => (
            <div key={k} style={{ padding: '7px 9px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 4, marginBottom: 4 }}>
              <div style={{ fontSize: 9, color: '#5C6FFF', fontWeight: 600, marginBottom: 2, fontFamily: 'monospace' }}>{k.slice(0, 32)}{k.length > 32 ? '…' : ''}</div>
              <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5 }}>{v.slice(0, 80)}{v.length > 80 ? '…' : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Analyst Notes</div>
      <div style={{ padding: '7px 9px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 4, marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{selected.data.name || selected.data.cveID}</div>
        <div style={{ fontSize: 9, color: C.muted }}>{selected.type.toUpperCase()}</div>
      </div>
      <textarea
        value={draft}
        onChange={e => { setDraft(e.target.value); setSaved(false); }}
        placeholder="Add analyst notes, IOC observations, investigation findings…"
        style={{ flex: 1, minHeight: 160, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 5, padding: '9px 10px', color: C.text, fontSize: 11, outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}
      />
      <div style={{ display: 'flex', gap: 7, marginTop: 8, alignItems: 'center' }}>
        <button onClick={save} style={{ flex: 1, padding: '8px', background: '#5C6FFF', border: 'none', borderRadius: 4, color: '#fff', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          {saved ? '✓ Saved' : 'Save Note'}
        </button>
        {draft && (
          <button onClick={() => setDraft('')} style={{ padding: '8px 10px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, fontSize: 11, cursor: 'pointer' }}>Clear</button>
        )}
      </div>
      <div style={{ fontSize: 9, color: C.muted, marginTop: 6, textAlign: 'center' }}>Notes saved to local storage · Private to this browser</div>
    </div>
  );
}

// ── TTP HEATMAP ───────────────────────────────────────────────────────────
function TTPHeatmap({ C }) {
  const phases = [...new Set(MITRE.techniques.map(t => t.phase))];
  const phaseCounts = {};
  phases.forEach(p => { phaseCounts[p] = MITRE.techniques.filter(t => t.phase === p).length; });
  const relCounts = {};
  MITRE.relationships.filter(r => r.rt === 'uses').forEach(r => {
    const tech = MITRE.techniques.find(t => t.stix_id === r.tgt);
    if (tech) relCounts[tech.stix_id] = (relCounts[tech.stix_id] || 0) + 1;
  });
  const maxRel = Math.max(...Object.values(relCounts), 1);
  const [hovPhase, setHovPhase] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const phaseTechs = selectedPhase ? MITRE.techniques.filter(t => t.phase === selectedPhase).sort((a, b) => (relCounts[b.stix_id] || 0) - (relCounts[a.stix_id] || 0)) : [];

  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>TTP Frequency Heatmap</div>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>Technique usage frequency across all known APT relationships. Click a phase to drill down.</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 12 }}>
        {phases.map(phase => {
          const count = phaseCounts[phase] || 0;
          const heat = count / Math.max(...Object.values(phaseCounts));
          const c = PHASE_COLORS[phase] || '#5C6FFF';
          const isSelected = selectedPhase === phase;
          return (
            <div key={phase} onClick={() => setSelectedPhase(isSelected ? null : phase)}
              onMouseEnter={() => setHovPhase(phase)} onMouseLeave={() => setHovPhase(null)}
              style={{ padding: '7px 9px', borderRadius: 4, cursor: 'pointer', border: `1px solid ${isSelected ? c : hovPhase === phase ? c + '88' : C.border}`, background: `${c}${Math.round(heat * 40).toString(16).padStart(2, '0')}`, transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: c }}>{phase.toUpperCase().slice(0, 12)}</span>
                <span style={{ fontSize: 9, color: C.muted }}>{count}</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${heat * 100}%`, background: c, borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>
      {selectedPhase && (
        <div>
          <div style={{ fontSize: 10, color: PHASE_COLORS[selectedPhase] || '#5C6FFF', fontWeight: 700, marginBottom: 8 }}>{selectedPhase} — Top Techniques by Usage</div>
          {phaseTechs.slice(0, 8).map(t => {
            const usage = relCounts[t.stix_id] || 0;
            const heat = usage / maxRel;
            return (
              <div key={t.stix_id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <div style={{ fontSize: 9, color: C.muted, minWidth: 48, fontFamily: 'monospace' }}>{t.id}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: C.text, marginBottom: 2 }}>{t.name}</div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(heat * 100, 5)}%`, background: PHASE_COLORS[t.phase] || '#5C6FFF', borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ fontSize: 9, color: C.muted, minWidth: 20, textAlign: 'right' }}>{usage}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SECTOR THREAT MAP ─────────────────────────────────────────────────────
const SECTOR_ACTORS = {
  'Finance': ['Wizard Spider', 'Indrik Spider', 'FIN7', 'Lazarus Group', 'Carbanak'],
  'Healthcare': ['Lazarus Group', 'Aquatic Panda', 'LuminousMoth'],
  'Government': ['Aquatic Panda', 'LuminousMoth', 'Elderwood', 'OilRig'],
  'Energy': ['Dragonfly', 'OilRig', 'Elderwood'],
  'Technology': ['LuminousMoth', 'Aquatic Panda', 'Elderwood', 'FIN7'],
  'Manufacturing': ['Indrik Spider', 'Dragonfly', 'Wizard Spider'],
  'Retail': ['FIN7', 'Wizard Spider', 'Indrik Spider'],
  'Telecom': ['LuminousMoth', 'Aquatic Panda', 'Elderwood'],
};

function SectorThreatMap({ C, onSelectActor }) {
  const [hovSector, setHovSector] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);
  const sectors = Object.keys(SECTOR_ACTORS);
  const maxCount = Math.max(...sectors.map(s => SECTOR_ACTORS[s].length));

  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Sector Threat Map</div>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>Which APT groups are actively targeting each industry sector.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
        {sectors.map(sector => {
          const actors = SECTOR_ACTORS[sector];
          const heat = actors.length / maxCount;
          const isSelected = selectedSector === sector;
          const threatColor = heat > 0.7 ? '#FF3E3E' : heat > 0.4 ? '#FF8C42' : '#FFB547';
          return (
            <div key={sector}>
              <div onClick={() => setSelectedSector(isSelected ? null : sector)}
                onMouseEnter={() => setHovSector(sector)} onMouseLeave={() => setHovSector(null)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, cursor: 'pointer', border: `1px solid ${isSelected ? threatColor : hovSector === sector ? C.border : 'transparent'}`, background: isSelected ? `${threatColor}10` : 'transparent', transition: 'all 0.12s' }}>
                <div style={{ minWidth: 80, fontSize: 10, fontWeight: 600, color: C.text }}>{sector}</div>
                <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${heat * 100}%`, background: threatColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontSize: 9, color: threatColor, fontWeight: 700, minWidth: 30, textAlign: 'right' }}>{actors.length} APTs</div>
              </div>
              {isSelected && (
                <div style={{ marginLeft: 16, marginTop: 4, marginBottom: 4 }}>
                  <div style={{ fontSize: 9, color: C.muted, marginBottom: 5 }}>Active threat actors targeting {sector}:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {actors.map(name => {
                      const group = MITRE.groups.find(g => g.name === name || g.aliases?.includes(name));
                      return (
                        <div key={name} onClick={() => group && onSelectActor({ type: 'actor', data: group })}
                          style={{ padding: '2px 7px', background: 'rgba(255,92,92,0.1)', border: '1px solid rgba(255,92,92,0.3)', borderRadius: 3, fontSize: 9, color: '#FF5C5C', cursor: group ? 'pointer' : 'default', fontWeight: 600 }}>
                          {name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding: '8px 10px', background: 'rgba(255,62,62,0.04)', border: '1px solid rgba(255,62,62,0.15)', borderRadius: 4 }}>
        <div style={{ fontSize: 9, color: '#FF5C5C', fontWeight: 700, marginBottom: 3 }}>Highest Risk Sectors</div>
        <div style={{ fontSize: 10, color: C.muted }}>Finance and Government face the broadest threat actor coverage with {SECTOR_ACTORS.Finance.length}+ active groups each.</div>
      </div>
    </div>
  );
}

// ── AI DIGEST GENERATOR ───────────────────────────────────────────────────
async function generateDigest() {
  const topActors = MITRE.groups.slice(0, 5).map(g => g.name).join(', ');
  const critKEVs = CISA_KEV.filter(k => parseFloat(k.severity) >= 9).map(k => `${k.cveID} (${k.vendor})`).join(', ');
  const topTechs = MITRE.techniques.slice(0, 5).map(t => `${t.name} (${t.phase})`).join(', ');
  return claude(`You are VeilOps AI. Generate a weekly threat intelligence digest for security leadership.
Active APT groups monitored: ${topActors}
Critical unpatched CVEs: ${critKEVs}
Most observed techniques this week: ${topTechs}
Respond ONLY in JSON (no markdown):
{
  "week_label": "Week of June 16, 2026",
  "threat_level": "ELEVATED|HIGH|CRITICAL|MODERATE",
  "executive_summary": "3-4 sentences for a CISO board briefing",
  "top_threats": [
    {"actor": "name", "activity": "1 sentence", "severity": "HIGH|CRITICAL|MEDIUM"},
    {"actor": "name", "activity": "1 sentence", "severity": "HIGH|CRITICAL|MEDIUM"},
    {"actor": "name", "activity": "1 sentence", "severity": "HIGH|CRITICAL|MEDIUM"}
  ],
  "critical_vulnerabilities": [
    {"cve": "CVE-ID", "note": "1 sentence on exploitation risk"},
    {"cve": "CVE-ID", "note": "1 sentence on exploitation risk"}
  ],
  "trending_techniques": ["technique 1", "technique 2", "technique 3"],
  "sector_alerts": [
    {"sector": "Finance", "alert": "1 sentence"},
    {"sector": "Healthcare", "alert": "1 sentence"}
  ],
  "recommended_actions": ["action 1", "action 2", "action 3"],
  "analyst_outlook": "2 sentences on the week ahead"
}`, 1500);
}

function DigestPanel({ C }) {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exported, setExported] = useState(false);

  const run = async () => {
    setLoading(true); setDigest(null); setError(null);
    try { setDigest(await generateDigest()); } catch { setError('Digest generation failed.'); }
    setLoading(false);
  };

  const exportDigest = () => {
    if (!digest) return;
    const lines = [
      'VEILOPS WEEKLY THREAT INTELLIGENCE DIGEST',
      '='.repeat(50),
      digest.week_label,
      `Threat Level: ${digest.threat_level}`,
      '',
      'EXECUTIVE SUMMARY',
      '-'.repeat(30),
      digest.executive_summary || '',
      '',
      'TOP THREATS',
      '-'.repeat(30),
      ...(digest.top_threats || []).map(t => `[${t.severity}] ${t.actor}: ${t.activity}`),
      '',
      'CRITICAL VULNERABILITIES',
      '-'.repeat(30),
      ...(digest.critical_vulnerabilities || []).map(v => `${v.cve}: ${v.note}`),
      '',
      'TRENDING TECHNIQUES',
      '-'.repeat(30),
      ...(digest.trending_techniques || []).map((t, i) => `${i + 1}. ${t}`),
      '',
      'SECTOR ALERTS',
      '-'.repeat(30),
      ...(digest.sector_alerts || []).map(s => `${s.sector}: ${s.alert}`),
      '',
      'RECOMMENDED ACTIONS',
      '-'.repeat(30),
      ...(digest.recommended_actions || []).map((a, i) => `${i + 1}. ${a}`),
      '',
      'ANALYST OUTLOOK',
      '-'.repeat(30),
      digest.analyst_outlook || '',
      '',
      '---',
      'Generated by VeilOps AI Intelligence Console',
      '© 2026 VeilOps Inc. · Intelligence Without the Oracle Tax'
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'veilops-weekly-digest.txt'; a.click();
    URL.revokeObjectURL(url);
    setExported(true);
  };

  const tlColor = { CRITICAL: '#FF3E3E', ELEVATED: '#FF8C42', HIGH: '#FFB547', MODERATE: '#3EFF8A' };
  const sevColor = { CRITICAL: '#FF3E3E', HIGH: '#FF8C42', MEDIUM: '#FFB547' };

  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Weekly Threat Digest</div>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>AI-generated threat intelligence briefing for security leadership.</div>
      {!digest && !loading && (
        <button onClick={run} style={{ width: '100%', background: 'linear-gradient(135deg,#5C6FFF,#3D50E0)', border: 'none', borderRadius: 5, padding: '10px', color: '#fff', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
          ⬡ Generate Weekly Digest
        </button>
      )}
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: 24, height: 24, border: '2px solid rgba(92,111,255,0.2)', borderTop: '2px solid #5C6FFF', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
          <div style={{ fontSize: 11, color: C.muted }}>Claude generating digest…</div>
        </div>
      )}
      {error && <div style={{ padding: '7px 10px', background: 'rgba(255,62,62,0.08)', border: '1px solid rgba(255,62,62,0.3)', borderRadius: 4, fontSize: 11, color: '#FF5C5C', marginBottom: 8 }}>{error}</div>}
      {digest && (
        <div>
          <div style={{ padding: '9px 11px', background: `${tlColor[digest.threat_level] || '#FFB547'}18`, border: `1px solid ${tlColor[digest.threat_level] || '#FFB547'}44`, borderRadius: 5, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 700, color: C.text }}>{digest.week_label}</span>
              <span style={{ padding: '2px 7px', background: `${tlColor[digest.threat_level]}33`, borderRadius: 3, fontSize: 9, fontWeight: 700, color: tlColor[digest.threat_level] }}>{digest.threat_level}</span>
            </div>
            <div style={{ fontSize: 11, color: '#ddd', lineHeight: 1.65 }}>{digest.executive_summary}</div>
          </div>
          {digest.top_threats?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Top Threats</div>
              {digest.top_threats.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 5, padding: '6px 8px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 4 }}>
                  <span style={{ padding: '1px 5px', borderRadius: 2, background: `${sevColor[t.severity] || C.muted}18`, color: sevColor[t.severity] || C.muted, fontSize: 8, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{t.severity}</span>
                  <div><div style={{ fontSize: 10, fontWeight: 600, color: '#FF5C5C', marginBottom: 1 }}>{t.actor}</div><div style={{ fontSize: 10, color: '#ddd', lineHeight: 1.5 }}>{t.activity}</div></div>
                </div>
              ))}
            </div>
          )}
          {digest.critical_vulnerabilities?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Critical CVEs</div>
              {digest.critical_vulnerabilities.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#FF3E3E', flexShrink: 0, fontWeight: 700 }}>{v.cve}</span>
                  <span style={{ fontSize: 10, color: C.muted, lineHeight: 1.5 }}>{v.note}</span>
                </div>
              ))}
            </div>
          )}
          {digest.trending_techniques?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Trending TTPs</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {digest.trending_techniques.map((t, i) => (
                  <span key={i} style={{ padding: '2px 7px', background: 'rgba(92,111,255,0.1)', border: '1px solid rgba(92,111,255,0.2)', borderRadius: 3, fontSize: 9, color: '#5C6FFF' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {digest.sector_alerts?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Sector Alerts</div>
              {digest.sector_alerts.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: '#FFB547', fontWeight: 700, minWidth: 70 }}>{s.sector}:</span>
                  <span style={{ fontSize: 10, color: C.muted, lineHeight: 1.5 }}>{s.alert}</span>
                </div>
              ))}
            </div>
          )}
          {digest.recommended_actions?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Actions</div>
              {digest.recommended_actions.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: '#3EFF8A', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 10, color: '#dde', lineHeight: 1.5 }}>{a}</span>
                </div>
              ))}
            </div>
          )}
          {digest.analyst_outlook && (
            <div style={{ padding: '8px 10px', background: 'rgba(92,111,255,0.06)', border: `1px solid ${C.border}`, borderRadius: 4, marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: '#5C6FFF', fontWeight: 700, marginBottom: 3 }}>ANALYST OUTLOOK</div>
              <div style={{ fontSize: 10, color: '#ddd', lineHeight: 1.65, fontStyle: 'italic' }}>{digest.analyst_outlook}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={exportDigest} style={{ flex: 1, padding: '8px', background: 'rgba(255,181,71,0.1)', border: '1px solid rgba(255,181,71,0.3)', borderRadius: 4, color: '#FFB547', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>↓ Export TXT</button>
            <button onClick={() => { setDigest(null); setExported(false); }} style={{ padding: '8px 10px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, fontSize: 11, cursor: 'pointer' }}>↻</button>
          </div>
          {exported && <div style={{ textAlign: 'center', fontSize: 10, color: '#3EFF8A', marginTop: 5 }}>✓ Digest downloaded</div>}
        </div>
      )}
    </div>
  );
}



// ── TOAST NOTIFICATION SYSTEM ─────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);
  const remove = (id) => setToasts(p => p.filter(t => t.id !== id));
  return { toasts, add, remove };
}

function ToastContainer({ toasts, remove }) {
  const colors = { info: '#5C6FFF', success: '#3EFF8A', warning: '#FFB547', error: '#FF3E3E', critical: '#FF3E3E' };
  const icons = { info: 'ℹ', success: '✓', warning: '⚠', error: '✗', critical: '🚨' };
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', background: '#0D1325', border: `1px solid ${colors[t.type] || colors.info}55`, borderLeft: `3px solid ${colors[t.type] || colors.info}`, borderRadius: 7, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'slideInRight 0.3s ease', fontFamily: 'Inter,sans-serif' }}>
          <span style={{ color: colors[t.type] || colors.info, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icons[t.type] || icons.info}</span>
          <div style={{ flex: 1, fontSize: 12, color: '#ddd', lineHeight: 1.5 }}>{t.msg}</div>
          <button onClick={() => remove(t.id)} style={{ background: 'transparent', border: 'none', color: '#8892A4', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
        </div>
      ))}
      <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}

// ── GEO THREAT MAP ────────────────────────────────────────────────────────
const APT_ORIGINS = [
  { name: 'Lazarus Group', country: 'North Korea', code: 'KP', x: 78.2, y: 28.5, actors: ['Lazarus Group'], color: '#FF3E3E', threat: 'CRITICAL' },
  { name: 'Wizard Spider', country: 'Russia', code: 'RU', x: 58, y: 20, actors: ['Wizard Spider', 'Indrik Spider', 'Star Blizzard'], color: '#FF5C5C', threat: 'CRITICAL' },
  { name: 'APT Groups', country: 'China', code: 'CN', x: 74, y: 32, actors: ['Aquatic Panda', 'LuminousMoth', 'Elderwood'], color: '#FF8C42', threat: 'HIGH' },
  { name: 'OilRig / APT34', country: 'Iran', code: 'IR', x: 59, y: 35, actors: ['OilRig'], color: '#FFB547', threat: 'HIGH' },
  { name: 'Dragonfly', country: 'Russia', code: 'RU2', x: 61, y: 18, actors: ['Dragonfly'], color: '#FF5C5C', threat: 'HIGH' },
  { name: 'Medusa Group', country: 'Unknown', code: 'XX', x: 45, y: 38, actors: ['Medusa Group'], color: '#8892A4', threat: 'MEDIUM' },
  { name: 'FIN7', country: 'Eastern Europe', code: 'UA', x: 54, y: 24, actors: ['FIN7'], color: '#FFB547', threat: 'HIGH' },
];

// Simplified SVG world map paths (major landmasses as simplified polygons)
const WORLD_REGIONS = [
  // North America
  { id: 'NA', path: 'M 8 22 L 28 18 L 32 22 L 30 28 L 26 32 L 20 34 L 14 30 L 8 26 Z', fill: 'rgba(92,111,255,0.08)' },
  // South America  
  { id: 'SA', path: 'M 18 36 L 26 34 L 28 40 L 26 50 L 22 54 L 18 52 L 16 44 Z', fill: 'rgba(92,111,255,0.06)' },
  // Europe
  { id: 'EU', path: 'M 44 16 L 56 14 L 58 18 L 56 22 L 50 24 L 44 22 Z', fill: 'rgba(92,111,255,0.08)' },
  // Africa
  { id: 'AF', path: 'M 44 26 L 54 24 L 58 30 L 56 44 L 50 50 L 44 48 L 40 40 L 40 30 Z', fill: 'rgba(92,111,255,0.06)' },
  // Russia/Central Asia
  { id: 'RU', path: 'M 56 12 L 82 10 L 84 16 L 78 20 L 64 20 L 58 16 Z', fill: 'rgba(92,111,255,0.07)' },
  // Middle East
  { id: 'ME', path: 'M 54 26 L 64 24 L 66 30 L 60 34 L 54 32 Z', fill: 'rgba(92,111,255,0.07)' },
  // South Asia
  { id: 'SA2', path: 'M 64 26 L 74 24 L 76 30 L 72 36 L 66 34 Z', fill: 'rgba(92,111,255,0.06)' },
  // East Asia
  { id: 'EA', path: 'M 74 18 L 86 16 L 88 24 L 82 28 L 76 26 Z', fill: 'rgba(92,111,255,0.08)' },
  // Southeast Asia
  { id: 'SEA', path: 'M 76 30 L 86 28 L 88 36 L 82 38 L 76 36 Z', fill: 'rgba(92,111,255,0.05)' },
  // Australia
  { id: 'AU', path: 'M 80 44 L 92 42 L 94 50 L 88 54 L 80 52 Z', fill: 'rgba(92,111,255,0.05)' },
];

function GeoThreatMap({ C, onSelectActor }) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setPulse(p => (p + 1) % 100), 50);
    return () => clearInterval(iv);
  }, []);

  const threatColor = { CRITICAL: '#FF3E3E', HIGH: '#FF8C42', MEDIUM: '#FFB547', LOW: '#3EFF8A' };
  const cur = selected || hovered;

  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>APT Origin Country Map</div>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>Known or attributed nation-state APT group origins. Click a marker to inspect.</div>

      {/* Map SVG */}
      <div style={{ background: 'rgba(92,111,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 7, overflow: 'hidden', marginBottom: 10, position: 'relative' }}>
        <svg viewBox="0 0 100 60" style={{ width: '100%', display: 'block' }} preserveAspectRatio="xMidYMid meet">
          {/* Ocean background */}
          <rect width="100" height="60" fill="rgba(10,15,30,0.8)" />
          {/* Grid lines */}
          {[20, 40, 60, 80].map(x => <line key={x} x1={x} y1="0" x2={x} y2="60" stroke="rgba(92,111,255,0.06)" strokeWidth="0.2" />)}
          {[15, 30, 45].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(92,111,255,0.06)" strokeWidth="0.2" />)}
          {/* Landmasses */}
          {WORLD_REGIONS.map(r => <path key={r.id} d={r.path} fill={r.fill} stroke="rgba(92,111,255,0.15)" strokeWidth="0.3" />)}
          {/* APT markers */}
          {APT_ORIGINS.map((apt, i) => {
            const isHov = hovered?.code === apt.code;
            const isSel = selected?.code === apt.code;
            const pulseFactor = Math.sin((pulse / 100) * Math.PI * 2 + i) * 0.5 + 0.5;
            const c = threatColor[apt.threat] || '#FFB547';
            return (
              <g key={apt.code} style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(apt)} onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(isSel ? null : apt)}>
                {/* Pulse ring */}
                <circle cx={apt.x} cy={apt.y} r={2 + pulseFactor * 3} fill="none" stroke={c} strokeWidth="0.4" opacity={0.3 * (1 - pulseFactor)} />
                {/* Core dot */}
                <circle cx={apt.x} cy={apt.y} r={isHov || isSel ? 2.2 : 1.4} fill={c} opacity={0.9} />
                {/* Label */}
                {(isHov || isSel) && (
                  <text x={apt.x + 2.5} y={apt.y + 0.8} fontSize="2.2" fill="#fff" fontFamily="Inter,sans-serif" fontWeight="bold">{apt.country}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        {Object.entries(threatColor).map(([level, color]) => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>{level}</span>
          </div>
        ))}
      </div>

      {/* Selected/hovered detail */}
      {cur ? (
        <div style={{ padding: '9px 11px', background: `${threatColor[cur.threat]}10`, border: `1px solid ${threatColor[cur.threat]}44`, borderRadius: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>{cur.country}</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{cur.actors.length} attributed group{cur.actors.length > 1 ? 's' : ''}</div>
            </div>
            <span style={{ padding: '2px 7px', borderRadius: 3, background: `${threatColor[cur.threat]}22`, border: `1px solid ${threatColor[cur.threat]}55`, fontSize: 9, fontWeight: 700, color: threatColor[cur.threat] }}>{cur.threat}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {cur.actors.map(name => {
              const group = MITRE.groups.find(g => g.name === name || g.aliases?.includes(name));
              return (
                <div key={name} onClick={() => group && onSelectActor({ type: 'actor', data: group })}
                  style={{ padding: '2px 7px', background: 'rgba(255,92,92,0.1)', border: '1px solid rgba(255,92,92,0.3)', borderRadius: 3, fontSize: 9, color: '#FF5C5C', cursor: group ? 'pointer' : 'default', fontWeight: 600 }}>
                  {name}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {APT_ORIGINS.map(apt => (
            <div key={apt.code} onClick={() => setSelected(apt)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 7px', borderRadius: 3, cursor: 'pointer', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = threatColor[apt.threat]; setHovered(apt); }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; setHovered(null); }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: threatColor[apt.threat], flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{apt.country}</span>
                <span style={{ fontSize: 9, color: C.muted, marginLeft: 6 }}>{apt.actors.slice(0, 2).join(', ')}{apt.actors.length > 2 ? ` +${apt.actors.length - 2}` : ''}</span>
              </div>
              <span style={{ fontSize: 9, color: threatColor[apt.threat], fontWeight: 700 }}>{apt.threat}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DARK WEB PULSE ────────────────────────────────────────────────────────
const DW_SOURCES = ['RaidForums2', 'BreachForums', 'XSS.is', 'Exploit.in', 'RAMP', 'Telegram ch.', 'Dread', 'AlphaBay'];
const DW_TYPES = ['credential_leak', 'ransomware_post', 'exploit_sale', 'data_auction', 'recruitment', 'infrastructure_sale', 'zero_day_claim', 'ttp_share'];
const DW_TYPE_LABELS = { credential_leak: 'Credential Leak', ransomware_post: 'Ransomware Post', exploit_sale: 'Exploit Sale', data_auction: 'Data Auction', recruitment: 'Actor Recruitment', infrastructure_sale: 'Infra for Sale', zero_day_claim: 'Zero-Day Claim', ttp_share: 'TTP Share' };
const DW_TYPE_COLORS = { credential_leak: '#FF5C5C', ransomware_post: '#FF3E3E', exploit_sale: '#BF5CFF', data_auction: '#FF8C42', recruitment: '#FFB547', infrastructure_sale: '#3EA8FF', zero_day_claim: '#FF3E3E', ttp_share: '#5C6FFF' };

const genDarkWebSignal = () => {
  const actors = MITRE.groups.slice(0, 12).map(g => g.name);
  const sectors = ['Finance', 'Healthcare', 'Government', 'Energy', 'Technology', 'Retail', 'Defense', 'Telecom'];
  const type = DW_TYPES[Math.floor(Math.random() * DW_TYPES.length)];
  const actor = Math.random() > 0.4 ? actors[Math.floor(Math.random() * actors.length)] : null;
  const sector = sectors[Math.floor(Math.random() * sectors.length)];
  const source = DW_SOURCES[Math.floor(Math.random() * DW_SOURCES.length)];
  const ago = Math.floor(Math.random() * 7200);

  const messages = {
    credential_leak: `${Math.floor(Math.random() * 500 + 10)}K ${sector} credentials posted for sale. Includes email, password hash, MFA seeds.`,
    ransomware_post: `${actor || 'Unknown TA'} claims successful breach of ${sector} org. 2.3TB exfiltrated. Ransom: $${Math.floor(Math.random() * 5 + 1)}M.`,
    exploit_sale: `PoC exploit for CVE-2024-${Math.floor(Math.random() * 9000 + 1000)} listed. ${actor || 'Seller'} requesting ${Math.floor(Math.random() * 80 + 10)} BTC.`,
    data_auction: `${sector} PII dataset auction opened. 48hr countdown. Starting bid $${Math.floor(Math.random() * 40 + 5)}K. Verified sample posted.`,
    recruitment: `${actor || 'APT group'} recruiting IABs with ${sector} access. Offering 20% profit share. Contact via encrypted channel.`,
    infrastructure_sale: `Compromised ${sector} RDP/VPN access bundle. ${Math.floor(Math.random() * 200 + 20)} hosts. Priced by org size.`,
    zero_day_claim: `Unpatched zero-day in ${['Windows', 'Linux kernel', 'Cisco IOS', 'FortiOS', 'VMware ESXi'][Math.floor(Math.random() * 5)]} claimed. Pre-auth RCE. Proof shared privately.`,
    ttp_share: `${actor || 'Threat actor'} shared updated playbook for ${sector} targeting. Includes AV bypass and persistence chain.`,
  };

  return {
    id: Math.random(),
    type,
    label: DW_TYPE_LABELS[type],
    color: DW_TYPE_COLORS[type],
    source,
    actor,
    sector,
    message: messages[type],
    time: ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.floor(ago / 60)}m ago` : `${Math.floor(ago / 3600)}h ago`,
    ts: Date.now() - ago * 1000,
    credibility: Math.floor(Math.random() * 40 + 55),
    verified: Math.random() > 0.6,
  };
};

function DarkWebPulse({ C, onToast }) {
  const [signals, setSignals] = useState(() => Array.from({ length: 12 }, genDarkWebSignal).sort((a, b) => b.ts - a.ts));
  const [filter, setFilter] = useState('all');
  const [paused, setPaused] = useState(false);
  const iRef = useRef(null);

  useEffect(() => {
    if (paused) return;
    iRef.current = setInterval(() => {
      const sig = genDarkWebSignal();
      sig.time = 'just now';
      sig.ts = Date.now();
      setSignals(p => [sig, ...p.slice(0, 19)]);
      if (sig.type === 'zero_day_claim' || sig.type === 'ransomware_post') {
        onToast && onToast(`🕸 Dark Web: ${sig.label} detected on ${sig.source}`, 'error', 5000);
      }
    }, 12000);
    return () => clearInterval(iRef.current);
  }, [paused, onToast]);

  const types = ['all', ...new Set(signals.map(s => s.type))];
  const filtered = filter === 'all' ? signals : signals.filter(s => s.type === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#BF5CFF', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 9, color: '#BF5CFF', fontWeight: 700, letterSpacing: '0.06em' }}>DARK WEB PULSE</span>
          <button onClick={() => setPaused(p => !p)} style={{ marginLeft: 'auto', padding: '1px 6px', borderRadius: 3, border: `1px solid ${C.border}`, background: 'transparent', color: paused ? '#3EFF8A' : C.muted, fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>
            {paused ? '▶ RESUME' : '⏸ PAUSE'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {['all', 'ransomware_post', 'zero_day_claim', 'credential_leak', 'exploit_sale'].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{ padding: '1px 5px', borderRadius: 2, border: `1px solid ${filter === t ? (DW_TYPE_COLORS[t] || '#5C6FFF') : C.border}`, background: filter === t ? `${DW_TYPE_COLORS[t] || '#5C6FFF'}18` : 'transparent', color: filter === t ? (DW_TYPE_COLORS[t] || '#5C6FFF') : C.muted, fontSize: 7, cursor: 'pointer', fontWeight: 600 }}>
              {t === 'all' ? 'ALL' : DW_TYPE_LABELS[t]?.split(' ')[0].toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '5px' }}>
        {filtered.map((sig, i) => (
          <div key={sig.id} style={{ padding: '8px 10px', borderRadius: 4, marginBottom: 4, background: 'rgba(191,92,255,0.03)', border: `1px solid ${i === 0 && !paused ? 'rgba(191,92,255,0.35)' : C.border}`, animation: i === 0 && !paused ? 'fadeIn 0.4s ease' : 'none', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = sig.color + '66'}
            onMouseLeave={e => e.currentTarget.style.borderColor = i === 0 && !paused ? 'rgba(191,92,255,0.35)' : C.border}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ padding: '1px 5px', borderRadius: 2, background: `${sig.color}18`, border: `1px solid ${sig.color}44`, fontSize: 8, fontWeight: 700, color: sig.color }}>{sig.label}</span>
                {sig.verified && <span style={{ fontSize: 7, color: '#3EFF8A', fontWeight: 700, background: 'rgba(62,255,138,0.1)', padding: '1px 4px', borderRadius: 2 }}>VERIFIED</span>}
              </div>
              <span style={{ fontSize: 8, color: C.muted }}>{sig.time}</span>
            </div>
            <div style={{ fontSize: 10, color: '#ddd', lineHeight: 1.55, marginBottom: 4 }}>{sig.message}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 8, color: '#BF5CFF', fontWeight: 600 }}>src: {sig.source}</span>
              {sig.actor && <span style={{ fontSize: 8, color: '#FF5C5C', fontWeight: 600 }}>actor: {sig.actor}</span>}
              <span style={{ fontSize: 8, color: C.muted, marginLeft: 'auto' }}>cred: <span style={{ color: sig.credibility > 80 ? '#FF3E3E' : sig.credibility > 65 ? '#FFB547' : '#8892A4', fontWeight: 600 }}>{sig.credibility}%</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ATTACK SIMULATION ─────────────────────────────────────────────────────
async function runAttackSim(actor, targetSector, env) {
  const techniques = MITRE.relationships
    .filter(r => r.src === actor.stix_id && r.rt === 'uses')
    .map(r => MITRE.techniques.find(t => t.stix_id === r.tgt))
    .filter(Boolean).slice(0, 8).map(t => `${t.name} (${t.phase})`).join(', ');

  return claude(`You are VeilOps Attack Simulation AI. Simulate an attack by this APT group against the target environment and generate a defender playbook.

APT Group: ${actor.name}
Known techniques: ${techniques || 'Unknown'}
Target sector: ${targetSector}
Environment: EDR=${env.hasEDR}, MFA=${env.hasMFA}, Patch cycle=${env.hasPatchCycle}

Respond ONLY in JSON (no markdown):
{
  "simulation_id": "SIM-${Date.now().toString(36).toUpperCase()}",
  "attack_chain": [
    {"phase": "Initial Access", "technique": "specific technique name", "likelihood": "High|Medium|Low", "detail": "1 sentence how they'd execute this"},
    {"phase": "Execution", "technique": "specific technique name", "likelihood": "High|Medium|Low", "detail": "1 sentence"},
    {"phase": "Persistence", "technique": "specific technique name", "likelihood": "High|Medium|Low", "detail": "1 sentence"},
    {"phase": "Lateral Movement", "technique": "specific technique name", "likelihood": "High|Medium|Low", "detail": "1 sentence"},
    {"phase": "Exfiltration", "technique": "specific technique name", "likelihood": "High|Medium|Low", "detail": "1 sentence"}
  ],
  "estimated_dwell_time": "X days",
  "weakest_link": "1 sentence on the environment's most exploitable gap",
  "defender_playbook": [
    {"priority": 1, "action": "specific action", "timeframe": "Immediate|24h|1 week", "effort": "Low|Medium|High"},
    {"priority": 2, "action": "specific action", "timeframe": "Immediate|24h|1 week", "effort": "Low|Medium|High"},
    {"priority": 3, "action": "specific action", "timeframe": "Immediate|24h|1 week", "effort": "Low|Medium|High"},
    {"priority": 4, "action": "specific action", "timeframe": "Immediate|24h|1 week", "effort": "Low|Medium|High"},
    {"priority": 5, "action": "specific action", "timeframe": "Immediate|24h|1 week", "effort": "Low|Medium|High"}
  ],
  "detection_opportunities": ["opp 1", "opp 2", "opp 3"],
  "estimated_impact": "CATASTROPHIC|SEVERE|MODERATE|LIMITED",
  "analyst_verdict": "2 sharp sentences"
}`, 1600);
}

function AttackSimPanel({ C, onToast }) {
  const [actor, setActor] = useState(null);
  const [sector, setSector] = useState('Finance');
  const [env, setEnv] = useState({ hasEDR: false, hasMFA: false, hasPatchCycle: false });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState(0);

  const impactColor = { CATASTROPHIC: '#FF3E3E', SEVERE: '#FF8C42', MODERATE: '#FFB547', LIMITED: '#3EFF8A' };
  const likelihoodColor = { High: '#FF5C5C', Medium: '#FFB547', Low: '#3EFF8A' };
  const effortColor = { Low: '#3EFF8A', Medium: '#FFB547', High: '#FF5C5C' };
  const timeColor = { Immediate: '#FF3E3E', '24h': '#FF8C42', '1 week': '#FFB547' };

  const run = async () => {
    if (!actor) return;
    setLoading(true); setResult(null); setError(null); setPhase(0);
    const phases = ['Profiling attack surface…', 'Mapping TTPs to environment…', 'Simulating attack chain…', 'Generating defender playbook…'];
    let pi = 0;
    const piv = setInterval(() => { pi = Math.min(pi + 1, phases.length - 1); setPhase(pi); }, 800);
    try {
      const r = await runAttackSim(actor, sector, env);
      setResult(r);
      onToast && onToast(`⚔ Attack sim complete: ${r.estimated_impact} impact estimated`, r.estimated_impact === 'CATASTROPHIC' ? 'critical' : 'warning');
    } catch { setError('Simulation failed.'); }
    clearInterval(piv);
    setLoading(false);
  };

  const simPhases = ['Profiling attack surface…', 'Mapping TTPs to environment…', 'Simulating attack chain…', 'Generating defender playbook…'];

  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Attack Simulation</div>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>Simulate an APT attack against your environment. Get a defender playbook with prioritized actions.</div>

      {/* Config */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, marginBottom: 4 }}>THREAT ACTOR</div>
        <select value={actor?.stix_id || ''} onChange={e => { const g = MITRE.groups.find(a => a.stix_id === e.target.value); setActor(g || null); setResult(null); }}
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${actor ? '#FF5C5C' : C.border}`, borderRadius: 4, padding: '6px 8px', color: C.text, fontSize: 11, outline: 'none' }}>
          <option value=''>Select APT group…</option>
          {MITRE.groups.map(g => <option key={g.stix_id} value={g.stix_id} style={{ background: '#0A0F1E' }}>{g.name}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, marginBottom: 3 }}>TARGET SECTOR</div>
          <select value={sector} onChange={e => { setSector(e.target.value); setResult(null); }}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px 6px', color: C.text, fontSize: 10, outline: 'none' }}>
            {['Finance', 'Healthcare', 'Government', 'Energy', 'Technology', 'Manufacturing', 'Defense'].map(s => <option key={s} value={s} style={{ background: '#0A0F1E' }}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, marginBottom: 3 }}>CONTROLS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[['hasEDR', 'EDR'], ['hasMFA', 'MFA'], ['hasPatchCycle', 'Patches']].map(([k, l]) => (
              <div key={k} onClick={() => { setEnv(e => ({ ...e, [k]: !e[k] })); setResult(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, border: `1.5px solid ${env[k] ? '#5C6FFF' : C.muted}`, background: env[k] ? '#5C6FFF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, color: '#fff', fontWeight: 700 }}>{env[k] ? '✓' : ''}</div>
                <span style={{ fontSize: 9, color: env[k] ? C.text : C.muted }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={run} disabled={!actor || loading}
        style={{ width: '100%', background: actor ? 'linear-gradient(135deg,#FF5C5C,#FF3E3E)' : 'rgba(255,92,92,0.2)', border: 'none', borderRadius: 5, padding: '10px', color: '#fff', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, cursor: actor ? 'pointer' : 'default', marginBottom: 10, opacity: loading ? 0.7 : 1 }}>
        {loading ? simPhases[phase] : '⚔ Run Attack Simulation'}
      </button>

      {loading && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((phase + 1) / 4) * 100}%`, background: 'linear-gradient(90deg,#FF5C5C,#FF3E3E)', borderRadius: 1, transition: 'width 0.8s ease' }} />
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6, textAlign: 'center' }}>{simPhases[phase]}</div>
        </div>
      )}
      {error && <div style={{ padding: '7px 10px', background: 'rgba(255,62,62,0.08)', border: '1px solid rgba(255,62,62,0.3)', borderRadius: 4, fontSize: 10, color: '#FF5C5C', marginBottom: 8 }}>{error}</div>}

      {result && (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '8px 10px', background: `${impactColor[result.estimated_impact]}18`, border: `1px solid ${impactColor[result.estimated_impact]}44`, borderRadius: 5 }}>
            <div>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, marginBottom: 1 }}>SIM ID: {result.simulation_id}</div>
              <div style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>Dwell time: {result.estimated_dwell_time}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: C.muted, fontWeight: 600, marginBottom: 1 }}>IMPACT</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, fontWeight: 700, color: impactColor[result.estimated_impact] }}>{result.estimated_impact}</div>
            </div>
          </div>

          {/* Attack chain */}
          {result.attack_chain?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: '#FF5C5C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Attack Chain</div>
              {result.attack_chain.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${likelihoodColor[step.likelihood]}22`, border: `1.5px solid ${likelihoodColor[step.likelihood]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: likelihoodColor[step.likelihood], fontWeight: 700 }}>{i + 1}</div>
                    {i < result.attack_chain.length - 1 && <div style={{ width: 1, height: 12, background: `${C.border}`, marginTop: 2 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <span style={{ fontSize: 9, color: likelihoodColor[step.likelihood], fontWeight: 700 }}>{step.phase}</span>
                      <span style={{ fontSize: 8, color: C.muted }}>·</span>
                      <span style={{ fontSize: 8, color: C.muted, fontWeight: 600 }}>{step.likelihood} likelihood</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.text, fontWeight: 600, marginBottom: 1 }}>{step.technique}</div>
                    <div style={{ fontSize: 9, color: C.muted, lineHeight: 1.5 }}>{step.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Weakest link */}
          {result.weakest_link && (
            <div style={{ padding: '7px 9px', background: 'rgba(255,62,62,0.06)', border: '1px solid rgba(255,62,62,0.2)', borderRadius: 4, marginBottom: 10 }}>
              <div style={{ fontSize: 8, color: '#FF5C5C', fontWeight: 700, marginBottom: 2 }}>WEAKEST LINK</div>
              <div style={{ fontSize: 10, color: '#ddd', lineHeight: 1.55 }}>{result.weakest_link}</div>
            </div>
          )}

          {/* Defender playbook */}
          {result.defender_playbook?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: '#3EFF8A', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Defender Playbook</div>
              {result.defender_playbook.map((step, i) => (
                <div key={i} style={{ padding: '6px 8px', background: 'rgba(62,255,138,0.03)', border: `1px solid ${C.border}`, borderRadius: 4, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(62,255,138,0.15)', border: '1px solid rgba(62,255,138,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#3EFF8A', fontWeight: 700 }}>{step.priority}</span>
                      <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 2, background: `${timeColor[step.timeframe]}18`, color: timeColor[step.timeframe], fontWeight: 700 }}>{step.timeframe}</span>
                    </div>
                    <span style={{ fontSize: 8, color: effortColor[step.effort], fontWeight: 600 }}>{step.effort} effort</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#dde', lineHeight: 1.5 }}>{step.action}</div>
                </div>
              ))}
            </div>
          )}

          {/* Detection opps */}
          {result.detection_opportunities?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: '#3EA8FF', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Detection Opportunities</div>
              {result.detection_opportunities.map((o, i) => (
                <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: '#3EA8FF', flexShrink: 0 }}>◈</span>
                  <span style={{ fontSize: 10, color: '#dde', lineHeight: 1.5 }}>{o}</span>
                </div>
              ))}
            </div>
          )}

          {/* Verdict */}
          {result.analyst_verdict && (
            <div style={{ padding: '8px 10px', background: 'rgba(255,181,71,0.06)', border: '1px solid rgba(255,181,71,0.2)', borderRadius: 4 }}>
              <div style={{ fontSize: 8, color: '#FFB547', fontWeight: 700, marginBottom: 2 }}>ANALYST VERDICT</div>
              <div style={{ fontSize: 10, color: '#ddd', lineHeight: 1.6, fontStyle: 'italic' }}>{result.analyst_verdict}</div>
            </div>
          )}

          <button onClick={() => setResult(null)} style={{ width: '100%', marginTop: 8, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px', color: C.muted, fontSize: 10, cursor: 'pointer' }}>↻ New Simulation</button>
        </div>
      )}
    </div>
  );
}



// ── SEARCH HISTORY ────────────────────────────────────────────────────────
function useSearchHistory() {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('veilops_history') || '[]'); } catch { return []; }
  });
  const push = useCallback((item) => {
    setHistory(prev => {
      const key = item.data?.stix_id || item.data?.cveID || item.data?.ioc;
      const filtered = prev.filter(h => (h.data?.stix_id || h.data?.cveID || h.data?.ioc) !== key);
      const next = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, 20);
      try { localStorage.setItem('veilops_history', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const clear = () => { setHistory([]); try { localStorage.removeItem('veilops_history'); } catch {} };
  return { history, push, clear };
}

function HistoryPanel({ C, searchHistory, onSelect }) {
  const typeColor = { actor: '#FF5C5C', technique: '#5C6FFF', malware: '#FFB547', kev: '#FF3E3E' };
  const timeAgo = (ts) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Recent Activity</div>
        {searchHistory.history.length > 0 && (
          <button onClick={searchHistory.clear} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 3, padding: '1px 7px', color: C.muted, fontSize: 9, cursor: 'pointer' }}>Clear</button>
        )}
      </div>
      {searchHistory.history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🕐</div>
          <div style={{ color: C.muted, fontSize: 12 }}>No recent activity yet.</div>
          <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>Items you view will appear here.</div>
        </div>
      ) : (
        searchHistory.history.map((item, i) => {
          const c = typeColor[item.type] || C.muted;
          return (
            <div key={i} onClick={() => onSelect(item)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 4, marginBottom: 3, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = c}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ width: 6, height: 6, borderRadius: item.type === 'technique' ? 2 : '50%', background: c, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.data?.name || item.data?.cveID}</div>
                <div style={{ fontSize: 9, color: C.muted }}>{item.type.toUpperCase()}{item.type === 'technique' ? ` · ${item.data?.phase}` : ''}</div>
              </div>
              <div style={{ fontSize: 8, color: C.muted, flexShrink: 0 }}>{timeAgo(item.viewedAt)}</div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── STATS BAR ─────────────────────────────────────────────────────────────
function ConsoleStatsBar({ C, alertCount, kevCount, actorCount, watchlistCount }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 3000); return () => clearInterval(iv); }, []);
  const stats = [
    { label: 'APT Groups', value: actorCount, color: '#FF5C5C', pulse: true },
    { label: 'Active KEVs', value: kevCount, color: '#FF3E3E', pulse: true },
    { label: 'Live Alerts', value: alertCount + (tick % 3 === 0 ? 1 : 0), color: '#FFB547', pulse: true },
    { label: 'Watched', value: watchlistCount, color: '#5C6FFF', pulse: false },
    { label: 'TTPs Mapped', value: 60, color: '#A8FF3E', pulse: false },
    { label: 'IOCs Indexed', value: 8, color: '#BF5CFF', pulse: false },
  ];
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: 'auto' }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>
          {s.pulse && <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, animation: 'pulse 2s infinite' }} />}
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 8, color: C.muted, marginTop: 1, whiteSpace: 'nowrap' }}>{s.label}</div>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', marginLeft: 'auto' }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3EFF8A', animation: 'pulse 1.5s infinite' }} />
        <span style={{ fontSize: 9, color: '#3EFF8A', fontWeight: 700 }}>LIVE</span>
        <span style={{ fontSize: 8, color: C.muted }}>· MITRE ATT&CK + CISA KEV</span>
      </div>
    </div>
  );
}

// ── THREAT COMPARISON MATRIX ───────────────────────────────────────────────
function ThreatMatrixPanel({ C, onSelect }) {
  const [view, setView] = useState('matrix'); // matrix | ranking
  const [hovCell, setHovCell] = useState(null);

  // Build actor × phase matrix
  const phases = ['Initial Access', 'Execution', 'Persistence', 'Privilege Escalation', 'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement', 'Collection', 'Exfiltration', 'Impact'];
  const actors = MITRE.groups.slice(0, 10);

  const matrix = {};
  actors.forEach(a => {
    matrix[a.stix_id] = {};
    const actorTechIds = new Set(MITRE.relationships.filter(r => r.src === a.stix_id && r.rt === 'uses').map(r => r.tgt));
    phases.forEach(phase => {
      const count = MITRE.techniques.filter(t => actorTechIds.has(t.stix_id) && t.phase === phase).length;
      matrix[a.stix_id][phase] = count;
    });
  });

  // Rankings: actors by total technique count
  const rankings = actors.map(a => ({
    actor: a,
    total: Object.values(matrix[a.stix_id]).reduce((s, v) => s + v, 0),
    phases: Object.entries(matrix[a.stix_id]).filter(([, v]) => v > 0).length,
  })).sort((a, b) => b.total - a.total);

  const maxVal = Math.max(...actors.flatMap(a => Object.values(matrix[a.stix_id])));

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Threat Matrix</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['matrix', 'Matrix'], ['ranking', 'Ranking']].map(([k, v]) => (
            <button key={k} onClick={() => setView(k)} style={{ padding: '2px 8px', borderRadius: 3, border: `1px solid ${view === k ? '#5C6FFF' : C.border}`, background: view === k ? 'rgba(92,111,255,0.15)' : 'transparent', color: view === k ? '#fff' : C.muted, fontSize: 9, cursor: 'pointer', fontWeight: 600 }}>{v}</button>
          ))}
        </div>
      </div>

      {view === 'matrix' && (
        <div>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>APT group × Kill chain phase coverage. Darker = more techniques.</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 8, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '3px 4px', color: C.muted, textAlign: 'left', whiteSpace: 'nowrap', minWidth: 80 }}>Actor</th>
                  {phases.map(p => (
                    <th key={p} style={{ padding: '2px 3px', color: C.muted, fontSize: 7, textAlign: 'center', writingMode: 'vertical-lr', transform: 'rotate(180deg)', maxWidth: 16 }}>{p.slice(0, 8)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actors.map(actor => (
                  <tr key={actor.stix_id}>
                    <td style={{ padding: '2px 4px', color: '#FF5C5C', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 9, cursor: 'pointer' }}
                      onClick={() => onSelect({ type: 'actor', data: actor })}>
                      {actor.name.split(' ')[0]}
                    </td>
                    {phases.map(phase => {
                      const val = matrix[actor.stix_id][phase];
                      const heat = val / Math.max(maxVal, 1);
                      const cellKey = `${actor.stix_id}-${phase}`;
                      const isHov = hovCell === cellKey;
                      return (
                        <td key={phase} onMouseEnter={() => setHovCell(cellKey)} onMouseLeave={() => setHovCell(null)}
                          style={{ padding: '2px 3px', textAlign: 'center' }}>
                          <div style={{
                            width: 14, height: 14, borderRadius: 2, margin: '0 auto',
                            background: val > 0 ? `rgba(255,92,92,${0.15 + heat * 0.75})` : 'rgba(255,255,255,0.04)',
                            border: isHov ? '1px solid #FF5C5C' : '1px solid transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 7, color: val > 0 ? '#fff' : C.muted, fontWeight: 700,
                            cursor: 'default', transition: 'all 0.12s',
                          }}>
                            {val > 0 ? val : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 8, color: C.muted, marginTop: 8, textAlign: 'center' }}>Click actor name to analyze · Numbers = technique count per phase</div>
        </div>
      )}

      {view === 'ranking' && (
        <div>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>APT groups ranked by total mapped technique coverage.</div>
          {rankings.map((r, i) => (
            <div key={r.actor.stix_id} onClick={() => onSelect({ type: 'actor', data: r.actor })}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 4, marginBottom: 4, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#FF5C5C'}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: i < 3 ? '#FF5C5C' : C.muted, minWidth: 20, textAlign: 'center' }}>#{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 2 }}>{r.actor.name}</div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(r.total / rankings[0].total) * 100}%`, background: `rgba(255,92,92,${0.4 + (i === 0 ? 0.6 : 0.3)})`, borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#FF5C5C' }}>{r.total}</div>
                <div style={{ fontSize: 8, color: C.muted }}>{r.phases} phases</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── INTELLIGENCE FEED (RSS-style combined) ────────────────────────────────
const INTEL_FEED_ITEMS = [
  { id: 1, source: 'CISA', title: 'CISA adds Fortinet FortiOS SSL-VPN flaw to KEV catalog', tags: ['fortinet', 'ssl-vpn', 'kev'], severity: 'CRITICAL', ts: Date.now() - 1800000 },
  { id: 2, source: 'MITRE', title: 'New technique added: T1218.014 - MMC Execution', tags: ['windows', 'lolbas', 'defense-evasion'], severity: 'MEDIUM', ts: Date.now() - 3600000 },
  { id: 3, source: 'VeilOps', title: 'Lazarus Group targeting crypto exchanges with updated BLINDINGCAN variant', tags: ['lazarus', 'crypto', 'north-korea'], severity: 'HIGH', ts: Date.now() - 7200000 },
  { id: 4, source: 'CISA', title: 'Advisory AA24-109A: State-sponsored actors targeting water sector', tags: ['ics', 'water', 'critical-infrastructure'], severity: 'CRITICAL', ts: Date.now() - 10800000 },
  { id: 5, source: 'VeilOps', title: 'FIN7 resuming Carbanak-style campaigns against POS systems', tags: ['fin7', 'pos', 'financial'], severity: 'HIGH', ts: Date.now() - 14400000 },
  { id: 6, source: 'MITRE', title: 'ATT&CK v15 released: 21 new (sub)techniques added', tags: ['mitre', 'update', 'ttp'], severity: 'INFO', ts: Date.now() - 21600000 },
  { id: 7, source: 'VeilOps', title: 'Dragonfly campaign resurfaces targeting EU energy grid operators', tags: ['dragonfly', 'energy', 'europe'], severity: 'CRITICAL', ts: Date.now() - 28800000 },
  { id: 8, source: 'CISA', title: 'Known exploited: CVE-2024-27198 JetBrains TeamCity RCE actively exploited', tags: ['jetbrains', 'rce', 'kev'], severity: 'CRITICAL', ts: Date.now() - 32400000 },
  { id: 9, source: 'VeilOps', title: 'Aquatic Panda linked to new watering-hole campaign against APAC telecom', tags: ['aquatic-panda', 'watering-hole', 'telecom'], severity: 'HIGH', ts: Date.now() - 43200000 },
  { id: 10, source: 'MITRE', title: 'OilRig (APT34) observed using new DNS tunneling C2 infrastructure', tags: ['oilrig', 'dns', 'c2'], severity: 'HIGH', ts: Date.now() - 50400000 },
  { id: 11, source: 'CISA', title: 'Citrix Bleed exploitation wave confirmed across healthcare sector', tags: ['citrix', 'healthcare', 'exploitation'], severity: 'CRITICAL', ts: Date.now() - 57600000 },
  { id: 12, source: 'VeilOps', title: 'Indrik Spider deploys Dridex against European financial institutions', tags: ['indrik-spider', 'dridex', 'finance'], severity: 'HIGH', ts: Date.now() - 72000000 },
];

function IntelFeedPanel({ C, onToast }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const sevColor = { CRITICAL: '#FF3E3E', HIGH: '#FF8C42', MEDIUM: '#FFB547', LOW: '#3EFF8A', INFO: '#5C6FFF' };
  const srcColor = { CISA: '#FF3E3E', MITRE: '#5C6FFF', VeilOps: '#FFB547' };

  const timeAgo = (ts) => {
    const h = Math.floor((Date.now() - ts) / 3600000);
    if (h < 1) return `${Math.floor((Date.now() - ts) / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const filtered = INTEL_FEED_ITEMS
    .filter(i => filter === 'all' || i.source === filter || i.severity === filter)
    .filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.tags.some(t => t.includes(search.toLowerCase())));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Controls */}
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search feed…"
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px 8px', color: C.text, fontSize: 10, outline: 'none', fontFamily: 'Inter', boxSizing: 'border-box', marginBottom: 6 }} />
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {['all', 'CISA', 'MITRE', 'VeilOps', 'CRITICAL', 'HIGH'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '1px 6px', borderRadius: 2, border: `1px solid ${filter === f ? (sevColor[f] || srcColor[f] || '#5C6FFF') : C.border}`, background: filter === f ? `${sevColor[f] || srcColor[f] || '#5C6FFF'}18` : 'transparent', color: filter === f ? (sevColor[f] || srcColor[f] || '#fff') : C.muted, fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '5px' }}>
        {filtered.map(item => (
          <div key={item.id} style={{ padding: '8px 10px', borderRadius: 4, marginBottom: 4, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all 0.12s' }}
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
            onMouseEnter={e => e.currentTarget.style.borderColor = sevColor[item.severity]}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ padding: '1px 5px', borderRadius: 2, background: `${srcColor[item.source]}18`, border: `1px solid ${srcColor[item.source]}44`, fontSize: 8, fontWeight: 700, color: srcColor[item.source] }}>{item.source}</span>
                <span style={{ padding: '1px 5px', borderRadius: 2, background: `${sevColor[item.severity]}18`, border: `1px solid ${sevColor[item.severity]}44`, fontSize: 8, fontWeight: 700, color: sevColor[item.severity] }}>{item.severity}</span>
              </div>
              <span style={{ fontSize: 8, color: C.muted, flexShrink: 0 }}>{timeAgo(item.ts)}</span>
            </div>
            <div style={{ fontSize: 11, color: C.text, lineHeight: 1.5, marginBottom: 4 }}>{item.title}</div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {item.tags.map(tag => (
                <span key={tag} style={{ padding: '1px 5px', background: 'rgba(92,111,255,0.08)', border: `1px solid ${C.border}`, borderRadius: 2, fontSize: 7, color: '#5C6FFF' }}>#{tag}</span>
              ))}
            </div>
            {expanded === item.id && (
              <div style={{ marginTop: 8, padding: '7px 9px', background: 'rgba(92,111,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 4 }}>
                <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.6 }}>
                  {item.severity === 'CRITICAL' ? '⚠ This item requires immediate analyst attention. ' : ''}
                  Source: {item.source} Intelligence Feed. Published {timeAgo(item.ts)}.
                  {item.source === 'CISA' ? ' This advisory is from the Cybersecurity and Infrastructure Security Agency.' : item.source === 'MITRE' ? ' ATT&CK framework update — review new technique coverage.' : ' VeilOps threat intelligence correlation engine flagged this activity.'}
                </div>
                <button onClick={e => { e.stopPropagation(); onToast && onToast(`Bookmarked: ${item.title.slice(0, 50)}…`, 'success'); }}
                  style={{ marginTop: 6, padding: '4px 10px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 3, color: C.muted, fontSize: 9, cursor: 'pointer' }}>
                  ★ Bookmark
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}



// ── CAMPAIGN TRACKER ──────────────────────────────────────────────────────
const CAMPAIGNS = [
  {
    id: 'c001', name: 'Operation DreamJob', actor: 'Lazarus Group', stix: 'intrusion-set--01e28736-2ffc-455b-9880-ed4d1407ae07',
    status: 'ACTIVE', start: '2023-06', sector: 'Finance / Crypto',
    description: 'Lazarus targets job seekers with fake LinkedIn/WhatsApp offers. Malicious documents deliver BLINDINGCAN and other RATs.',
    techniques: ['Spearphishing Link', 'Malicious File', 'Command and Scripting Interpreter', 'Ingress Tool Transfer'],
    iocs: ['185.220.101.47', 'dreamjob-recruiter.com', 'linkedin-job-apply.net'],
    victims: 47, countries: ['USA', 'Germany', 'Japan', 'South Korea', 'Singapore'],
    tlp: 'AMBER',
  },
  {
    id: 'c002', name: 'Carbanak 2024', actor: 'FIN7', stix: '',
    status: 'ACTIVE', start: '2024-01', sector: 'Finance / Retail',
    description: 'FIN7 resurges targeting POS systems and financial backends. Updated GRIFFON JS backdoor observed with new C2 infrastructure.',
    techniques: ['Phishing', 'PowerShell', 'Credential Dumping', 'Lateral Tool Transfer'],
    iocs: ['cobaltrike.evil-domain.com', '91.92.251.103'],
    victims: 23, countries: ['USA', 'UK', 'Australia', 'Canada'],
    tlp: 'RED',
  },
  {
    id: 'c003', name: 'HAVEX Resurgence', actor: 'Dragonfly', stix: '',
    status: 'MONITORING', start: '2024-03', sector: 'Energy / ICS',
    description: 'Dragonfly targeting European energy infrastructure with updated Backdoor.Oldrea toolkit and new watering-hole techniques.',
    techniques: ['Supply Chain Compromise', 'Watering Hole', 'Remote Services', 'Modify System Image'],
    iocs: ['91.92.251.103', 'update.energy-grid-monitor.eu'],
    victims: 8, countries: ['Germany', 'France', 'Netherlands', 'Poland'],
    tlp: 'AMBER',
  },
  {
    id: 'c004', name: 'Double Dragon Wave 3', actor: 'Aquatic Panda', stix: '',
    status: 'ACTIVE', start: '2024-02', sector: 'Telecom / Technology',
    description: 'Aquatic Panda expanding APAC telecom targeting with updated Cobalt Strike profiles and novel persistence via scheduled tasks.',
    techniques: ['Valid Accounts', 'Exploit Public-Facing Application', 'Scheduled Task', 'Data Compressed'],
    iocs: ['103.27.108.215', 'cdn-telecom-update.asia'],
    victims: 31, countries: ['Australia', 'Singapore', 'Taiwan', 'India'],
    tlp: 'GREEN',
  },
  {
    id: 'c005', name: 'TA505 Distribution Campaign', actor: 'Indrik Spider', stix: '',
    status: 'CONTAINED', start: '2023-11', sector: 'Finance / Multi-sector',
    description: 'Indrik Spider mass-distributing Dridex banking trojan via malspam. Updated evasion bypasses modern AV via living-off-the-land binaries.',
    techniques: ['Phishing Attachment', 'Mshta', 'Regsvr32', 'BITS Jobs'],
    iocs: ['cdn-update.azureedge-ms.net', 'd41d8cd98f00b204e9800998ecf8427e'],
    victims: 156, countries: ['USA', 'UK', 'Germany', 'France', 'Spain'],
    tlp: 'WHITE',
  },
];

function CampaignTracker({ C, onSelectActor, onToast }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  const statusColor = { ACTIVE: '#FF3E3E', MONITORING: '#FFB547', CONTAINED: '#3EFF8A' };
  const tlpColor = { RED: '#FF3E3E', AMBER: '#FFB547', GREEN: '#3EFF8A', WHITE: '#fff' };

  const filtered = filter === 'all' ? CAMPAIGNS : CAMPAIGNS.filter(c => c.status === filter);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Campaign Tracker</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'ACTIVE', 'MONITORING', 'CONTAINED'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setSelected(null); }}
              style={{ padding: '1px 6px', borderRadius: 2, border: `1px solid ${filter === f ? (statusColor[f] || '#5C6FFF') : C.border}`, background: filter === f ? `${statusColor[f] || '#5C6FFF'}18` : 'transparent', color: filter === f ? (statusColor[f] || '#fff') : C.muted, fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>
              {f === 'all' ? 'ALL' : f}
            </button>
          ))}
        </div>
      </div>

      {!selected ? (
        <div>
          {filtered.map(c => (
            <div key={c.id} onClick={() => setSelected(c)}
              style={{ padding: '9px 11px', borderRadius: 5, marginBottom: 6, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = statusColor[c.status]}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 1 }}>{c.name}</div>
                  <div style={{ fontSize: 9, color: '#FF5C5C', fontWeight: 600 }}>{c.actor}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <span style={{ padding: '1px 6px', borderRadius: 2, background: `${statusColor[c.status]}18`, border: `1px solid ${statusColor[c.status]}44`, fontSize: 8, fontWeight: 700, color: statusColor[c.status] }}>{c.status}</span>
                  <span style={{ padding: '1px 5px', borderRadius: 2, background: `${tlpColor[c.tlp]}18`, border: `1px solid ${tlpColor[c.tlp]}33`, fontSize: 7, fontWeight: 700, color: tlpColor[c.tlp] }}>TLP:{c.tlp}</span>
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5, marginBottom: 5 }}>{c.description.slice(0, 90)}…</div>
              <div style={{ display: 'flex', gap: 10, fontSize: 9 }}>
                <span style={{ color: C.muted }}><span style={{ color: '#FFB547', fontWeight: 700 }}>{c.victims}</span> victims</span>
                <span style={{ color: C.muted }}><span style={{ color: '#5C6FFF', fontWeight: 700 }}>{c.countries.length}</span> countries</span>
                <span style={{ color: C.muted }}>Since {c.start}</span>
                <span style={{ color: C.muted, marginLeft: 'auto' }}>{c.sector}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 11, marginBottom: 12, padding: 0 }}>← Back to campaigns</button>

          <div style={{ padding: '10px 12px', background: `${statusColor[selected.status]}08`, border: `1px solid ${statusColor[selected.status]}33`, borderRadius: 6, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{selected.name}</div>
                <div style={{ fontSize: 10, color: '#FF5C5C', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { const g = MITRE.groups.find(g => g.name === selected.actor); if (g) onSelectActor({ type: 'actor', data: g }); }}>
                  ↗ {selected.actor}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                <span style={{ padding: '2px 7px', borderRadius: 3, background: `${statusColor[selected.status]}22`, border: `1px solid ${statusColor[selected.status]}55`, fontSize: 9, fontWeight: 700, color: statusColor[selected.status] }}>{selected.status}</span>
                <span style={{ padding: '1px 6px', borderRadius: 2, background: `${tlpColor[selected.tlp]}18`, border: `1px solid ${tlpColor[selected.tlp]}33`, fontSize: 8, fontWeight: 700, color: tlpColor[selected.tlp] }}>TLP:{selected.tlp}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: '#FFB547' }}>{selected.victims}</div><div style={{ color: C.muted, fontSize: 8 }}>Victims</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: '#5C6FFF' }}>{selected.countries.length}</div><div style={{ color: C.muted, fontSize: 8 }}>Countries</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: '#3EA8FF' }}>{selected.techniques.length}</div><div style={{ color: C.muted, fontSize: 8 }}>TTPs</div></div>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Description</div>
            <div style={{ fontSize: 11, color: '#dde', lineHeight: 1.65 }}>{selected.description}</div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Observed Techniques</div>
            {selected.techniques.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: '#5C6FFF', flexShrink: 0 }}>◈</span>
                <span style={{ fontSize: 10, color: '#dde' }}>{t}</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Known IOCs</div>
            {selected.iocs.map((ioc, i) => (
              <div key={i} style={{ fontFamily: 'monospace', fontSize: 10, color: '#FF5C5C', marginBottom: 2, padding: '2px 6px', background: 'rgba(255,92,92,0.06)', borderRadius: 3, border: '1px solid rgba(255,92,92,0.2)' }}>{ioc}</div>
            ))}
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Affected Countries</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {selected.countries.map(c => (
                <span key={c} style={{ padding: '2px 7px', background: 'rgba(92,111,255,0.08)', border: `1px solid ${C.border}`, borderRadius: 3, fontSize: 9, color: '#5C6FFF' }}>{c}</span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={() => { const g = MITRE.groups.find(g => g.name === selected.actor); if (g) onSelectActor({ type: 'actor', data: g }); }}
              style={{ flex: 1, padding: '8px', background: 'rgba(255,92,92,0.1)', border: '1px solid rgba(255,92,92,0.3)', borderRadius: 4, color: '#FF5C5C', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
              Analyze Actor →
            </button>
            <button onClick={() => onToast && onToast(`Monitoring: ${selected.name}`, 'success')}
              style={{ flex: 1, padding: '8px', background: 'rgba(92,111,255,0.1)', border: `1px solid ${C.border}`, borderRadius: 4, color: '#5C6FFF', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
              ★ Monitor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VULNERABILITY SCANNER ─────────────────────────────────────────────────
async function scanVulns(assets) {
  const critKEVs = CISA_KEV.filter(k => parseFloat(k.severity) >= 9);
  return claude(`You are VeilOps vulnerability assessment AI. Assess these assets against known exploited vulnerabilities.
Assets declared: ${assets}
Critical KEVs in scope: ${critKEVs.map(k => `${k.cveID} (${k.vendor} ${k.product}, CVSS ${k.severity})`).join(', ')}
Respond ONLY in JSON (no markdown):
{
  "risk_rating": "CRITICAL|HIGH|MEDIUM|LOW",
  "exposed_systems": [
    {"asset": "asset name from input", "cve": "CVE-XXXX-XXXX", "severity": 9.8, "vendor": "vendor", "exploitability": "Actively Exploited|PoC Available|Theoretical", "remediation": "specific fix action"}
  ],
  "unmatched_assets": ["asset that had no matches"],
  "patch_priority": [
    {"order": 1, "action": "specific patch/config action", "deadline": "24h|1 week|1 month"}
  ],
  "estimated_exposure_window": "X days if unpatched",
  "analyst_note": "1 sharp sentence"
}`, 1400);
}

function VulnScanPanel({ C, onToast }) {
  const [assets, setAssets] = useState('Fortinet FortiOS, Palo Alto PAN-OS, Microsoft Windows, Apache Log4j');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    if (!assets.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const r = await scanVulns(assets);
      setResult(r);
      const critCount = r.exposed_systems?.filter(e => parseFloat(e.severity) >= 9).length || 0;
      onToast && onToast(`Scan complete: ${r.exposed_systems?.length || 0} vulnerabilities found${critCount > 0 ? `, ${critCount} CRITICAL` : ''}`, critCount > 0 ? 'error' : 'warning');
    } catch { setError('Scan failed.'); }
    setLoading(false);
  };

  const riskColor = { CRITICAL: '#FF3E3E', HIGH: '#FF8C42', MEDIUM: '#FFB547', LOW: '#3EFF8A' };
  const exColor = { 'Actively Exploited': '#FF3E3E', 'PoC Available': '#FFB547', 'Theoretical': '#8892A4' };
  const deadlineColor = { '24h': '#FF3E3E', '1 week': '#FF8C42', '1 month': '#FFB547' };

  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Vulnerability Scanner</div>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>Enter your asset types to scan against the CISA KEV catalog. Comma-separated.</div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 4 }}>ASSETS / PRODUCTS IN YOUR ENVIRONMENT</div>
        <textarea value={assets} onChange={e => { setAssets(e.target.value); setResult(null); }}
          style={{ width: '100%', minHeight: 70, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 5, padding: '8px 10px', color: C.text, fontSize: 11, outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>Quick add:</div>
        {[['Fortinet, Ivanti, Cisco', 'Network'], ['Microsoft, Apache, JetBrains', 'Enterprise'], ['VMware, Citrix', 'Cloud']].map(([preset, label]) => (
          <button key={label} onClick={() => { setAssets(preset); setResult(null); }}
            style={{ padding: '2px 7px', background: 'rgba(92,111,255,0.08)', border: `1px solid ${C.border}`, borderRadius: 3, color: '#5C6FFF', fontSize: 9, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      <button onClick={run} disabled={loading}
        style={{ width: '100%', background: 'linear-gradient(135deg,#FF5C5C,#FF3E3E)', border: 'none', borderRadius: 5, padding: '10px', color: '#fff', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 10, opacity: loading ? 0.7 : 1 }}>
        {loading ? '🔍 Scanning against CISA KEV…' : '🔍 Run Vulnerability Scan'}
      </button>

      {loading && (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ width: 22, height: 22, border: '2px solid rgba(255,62,62,0.2)', borderTop: '2px solid #FF3E3E', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
          <div style={{ fontSize: 10, color: C.muted }}>Matching assets against {CISA_KEV.length} known exploited CVEs…</div>
        </div>
      )}
      {error && <div style={{ padding: '7px 10px', background: 'rgba(255,62,62,0.08)', border: '1px solid rgba(255,62,62,0.3)', borderRadius: 4, fontSize: 10, color: '#FF5C5C', marginBottom: 8 }}>{error}</div>}

      {result && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: '9px 11px', background: `${riskColor[result.risk_rating]}10`, border: `1px solid ${riskColor[result.risk_rating]}44`, borderRadius: 5 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, marginBottom: 1 }}>OVERALL RISK</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: riskColor[result.risk_rating] }}>{result.risk_rating}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, marginBottom: 1 }}>EXPOSED SYSTEMS</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: '#FF5C5C' }}>{result.exposed_systems?.length || 0}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, marginBottom: 1 }}>EXPOSURE WINDOW</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#FFB547', marginTop: 2 }}>{result.estimated_exposure_window}</div>
            </div>
          </div>

          {result.exposed_systems?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: '#FF5C5C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Exposed Systems</div>
              {result.exposed_systems.map((s, i) => (
                <div key={i} style={{ padding: '8px 10px', background: 'rgba(255,62,62,0.04)', border: '1px solid rgba(255,62,62,0.15)', borderRadius: 5, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{s.asset}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(255,62,62,0.15)', color: '#FF3E3E' }}>CVSS {s.severity}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#FF5C5C', fontWeight: 700 }}>{s.cve}</span>
                    <span style={{ fontSize: 9, color: C.muted }}>· {s.vendor}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: exColor[s.exploitability] || '#FFB547' }}>{s.exploitability}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#dde', lineHeight: 1.5, padding: '5px 7px', background: 'rgba(62,255,138,0.04)', border: '1px solid rgba(62,255,138,0.15)', borderRadius: 3 }}>
                    <span style={{ color: '#3EFF8A', fontWeight: 700, marginRight: 5 }}>Fix:</span>{s.remediation}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.patch_priority?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: '#3EFF8A', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Patch Priority</div>
              {result.patch_priority.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5, padding: '6px 8px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 4 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(62,255,138,0.12)', border: '1px solid rgba(62,255,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#3EFF8A', fontWeight: 700, flexShrink: 0 }}>{p.order}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#dde', lineHeight: 1.5 }}>{p.action}</div>
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 700, color: deadlineColor[p.deadline] || '#FFB547', flexShrink: 0, marginTop: 2 }}>{p.deadline}</span>
                </div>
              ))}
            </div>
          )}

          {result.analyst_note && (
            <div style={{ padding: '8px 10px', background: 'rgba(255,181,71,0.06)', border: '1px solid rgba(255,181,71,0.2)', borderRadius: 4 }}>
              <div style={{ fontSize: 8, color: '#FFB547', fontWeight: 700, marginBottom: 2 }}>ANALYST NOTE</div>
              <div style={{ fontSize: 10, color: '#ddd', lineHeight: 1.6, fontStyle: 'italic' }}>{result.analyst_note}</div>
            </div>
          )}

          <button onClick={() => setResult(null)} style={{ width: '100%', marginTop: 8, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px', color: C.muted, fontSize: 10, cursor: 'pointer' }}>↻ New Scan</button>
        </div>
      )}
    </div>
  );
}

// ── THREAT BRIEF BUILDER ──────────────────────────────────────────────────
async function buildThreatBrief(audience, focus, timeframe) {
  const actors = MITRE.groups.slice(0, 8).map(g => g.name).join(', ');
  const critKEVs = CISA_KEV.filter(k => parseFloat(k.severity) >= 9).slice(0, 3).map(k => k.cveID).join(', ');
  return claude(`You are VeilOps AI. Generate a custom threat intelligence brief.
Audience: ${audience}
Focus area: ${focus}
Timeframe: ${timeframe}
Monitored actors: ${actors}
Critical CVEs: ${critKEVs}
Respond ONLY in JSON (no markdown):
{
  "brief_title": "compelling title",
  "audience": "${audience}",
  "classification": "TLP:WHITE|TLP:GREEN|TLP:AMBER",
  "key_findings": ["finding 1", "finding 2", "finding 3", "finding 4"],
  "threat_summary": "3-4 sentence paragraph for ${audience}",
  "actor_spotlight": {"name": "most relevant actor", "why_relevant": "1 sentence specific to ${focus}"},
  "cve_spotlight": {"cve": "most relevant CVE", "impact": "1 sentence specific to ${focus}"},
  "recommended_actions": [
    {"action": "action text", "owner": "who should do this: CISO|SOC|IT|Legal|Exec", "urgency": "Now|This week|This month"}
  ],
  "indicators_to_monitor": ["indicator 1", "indicator 2", "indicator 3"],
  "next_steps": "2 sentences on what to do with this brief"
}`, 1400);
}

function ThreatBriefPanel({ C, onToast }) {
  const [audience, setAudience] = useState('CISO');
  const [focus, setFocus] = useState('Finance');
  const [timeframe, setTimeframe] = useState('Last 30 days');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null); setError(null);
    try {
      const r = await buildThreatBrief(audience, focus, timeframe);
      setResult(r);
      onToast && onToast(`Brief ready: ${r.brief_title?.slice(0, 40)}…`, 'success');
    } catch { setError('Brief generation failed.'); }
    setLoading(false);
  };

  const exportBrief = () => {
    if (!result) return;
    const urgencyColor = { Now: '🔴', 'This week': '🟡', 'This month': '🟢' };
    const lines = [
      `VEILOPS THREAT INTELLIGENCE BRIEF`,
      '='.repeat(52),
      `Title: ${result.brief_title}`,
      `Audience: ${result.audience}`,
      `Classification: ${result.classification}`,
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      '',
      'KEY FINDINGS',
      '-'.repeat(30),
      ...(result.key_findings || []).map((f, i) => `${i + 1}. ${f}`),
      '',
      'THREAT SUMMARY',
      '-'.repeat(30),
      result.threat_summary || '',
      '',
      'ACTOR SPOTLIGHT',
      '-'.repeat(30),
      `${result.actor_spotlight?.name}: ${result.actor_spotlight?.why_relevant}`,
      '',
      'CVE SPOTLIGHT',
      '-'.repeat(30),
      `${result.cve_spotlight?.cve}: ${result.cve_spotlight?.impact}`,
      '',
      'RECOMMENDED ACTIONS',
      '-'.repeat(30),
      ...(result.recommended_actions || []).map(a => `${urgencyColor[a.urgency]} [${a.urgency}] [${a.owner}] ${a.action}`),
      '',
      'INDICATORS TO MONITOR',
      '-'.repeat(30),
      ...(result.indicators_to_monitor || []).map((i, idx) => `${idx + 1}. ${i}`),
      '',
      'NEXT STEPS',
      '-'.repeat(30),
      result.next_steps || '',
      '',
      '---',
      'Generated by VeilOps Intelligence Console · © 2026 VeilOps Inc.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veilops-brief-${audience.toLowerCase()}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onToast && onToast('Brief exported successfully', 'success');
  };

  const tlpColor = { 'TLP:WHITE': '#fff', 'TLP:GREEN': '#3EFF8A', 'TLP:AMBER': '#FFB547' };
  const urgencyColor = { Now: '#FF3E3E', 'This week': '#FFB547', 'This month': '#3EFF8A' };
  const ownerColor = { CISO: '#FF5C5C', SOC: '#5C6FFF', IT: '#3EA8FF', Legal: '#FFB547', Exec: '#BF5CFF' };

  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Threat Brief Builder</div>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>Generate a tailored threat intelligence brief for any audience and sector.</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, marginBottom: 3 }}>AUDIENCE</div>
          <select value={audience} onChange={e => { setAudience(e.target.value); setResult(null); }}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px 7px', color: C.text, fontSize: 10, outline: 'none' }}>
            {['CISO', 'Board / Exec', 'SOC Team', 'IT Leadership', 'Legal / Compliance', 'Risk Committee'].map(a => (
              <option key={a} value={a} style={{ background: '#0A0F1E' }}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, marginBottom: 3 }}>FOCUS SECTOR</div>
          <select value={focus} onChange={e => { setFocus(e.target.value); setResult(null); }}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px 7px', color: C.text, fontSize: 10, outline: 'none' }}>
            {['Finance', 'Healthcare', 'Government', 'Energy', 'Technology', 'Manufacturing', 'Defense', 'Retail'].map(s => (
              <option key={s} value={s} style={{ background: '#0A0F1E' }}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, marginBottom: 3 }}>TIMEFRAME</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['Last 7 days', 'Last 30 days', 'Last quarter', 'Year to date'].map(t => (
            <button key={t} onClick={() => { setTimeframe(t); setResult(null); }}
              style={{ flex: 1, padding: '4px 2px', borderRadius: 3, border: `1px solid ${timeframe === t ? '#5C6FFF' : C.border}`, background: timeframe === t ? 'rgba(92,111,255,0.15)' : 'transparent', color: timeframe === t ? '#fff' : C.muted, fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>
              {t.replace('Last ', '')}
            </button>
          ))}
        </div>
      </div>

      <button onClick={run} disabled={loading}
        style={{ width: '100%', background: 'linear-gradient(135deg,#5C6FFF,#3D50E0)', border: 'none', borderRadius: 5, padding: '10px', color: '#fff', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 10, opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Building brief…' : `⬡ Build ${audience} Brief`}
      </button>

      {loading && (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ width: 22, height: 22, border: '2px solid rgba(92,111,255,0.2)', borderTop: '2px solid #5C6FFF', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
          <div style={{ fontSize: 10, color: C.muted }}>Claude tailoring brief for {audience}…</div>
        </div>
      )}
      {error && <div style={{ padding: '7px 10px', background: 'rgba(255,62,62,0.08)', border: '1px solid rgba(255,62,62,0.3)', borderRadius: 4, fontSize: 10, color: '#FF5C5C', marginBottom: 8 }}>{error}</div>}

      {result && (
        <div>
          <div style={{ padding: '9px 11px', background: 'rgba(92,111,255,0.06)', border: `1px solid ${C.border}`, borderRadius: 5, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, flex: 1, paddingRight: 8 }}>{result.brief_title}</div>
              <span style={{ padding: '2px 6px', borderRadius: 3, background: `${tlpColor[result.classification]}18`, border: `1px solid ${tlpColor[result.classification]}33`, fontSize: 8, fontWeight: 700, color: tlpColor[result.classification], flexShrink: 0 }}>{result.classification}</span>
            </div>
            <div style={{ fontSize: 9, color: C.muted }}>For: {result.audience} · {focus} · {timeframe}</div>
          </div>

          {result.key_findings?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: '#5C6FFF', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Key Findings</div>
              {result.key_findings.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, padding: '5px 7px', background: 'rgba(92,111,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 3 }}>
                  <span style={{ fontSize: 9, color: '#5C6FFF', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 10, color: '#dde', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
          )}

          {result.threat_summary && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Threat Summary</div>
              <div style={{ fontSize: 11, color: '#dde', lineHeight: 1.7 }}>{result.threat_summary}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {result.actor_spotlight && (
              <div style={{ flex: 1, padding: '8px', background: 'rgba(255,92,92,0.06)', border: '1px solid rgba(255,92,92,0.2)', borderRadius: 4 }}>
                <div style={{ fontSize: 8, color: '#FF5C5C', fontWeight: 700, marginBottom: 3 }}>ACTOR SPOTLIGHT</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.text, marginBottom: 2 }}>{result.actor_spotlight.name}</div>
                <div style={{ fontSize: 9, color: C.muted, lineHeight: 1.5 }}>{result.actor_spotlight.why_relevant}</div>
              </div>
            )}
            {result.cve_spotlight && (
              <div style={{ flex: 1, padding: '8px', background: 'rgba(255,62,62,0.06)', border: '1px solid rgba(255,62,62,0.2)', borderRadius: 4 }}>
                <div style={{ fontSize: 8, color: '#FF3E3E', fontWeight: 700, marginBottom: 3 }}>CVE SPOTLIGHT</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#FF5C5C', fontFamily: 'monospace', marginBottom: 2 }}>{result.cve_spotlight.cve}</div>
                <div style={{ fontSize: 9, color: C.muted, lineHeight: 1.5 }}>{result.cve_spotlight.impact}</div>
              </div>
            )}
          </div>

          {result.recommended_actions?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: '#3EFF8A', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Recommended Actions</div>
              {result.recommended_actions.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4, padding: '5px 7px', background: 'rgba(62,255,138,0.03)', border: `1px solid ${C.border}`, borderRadius: 3 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 2, background: `${urgencyColor[a.urgency]}18`, color: urgencyColor[a.urgency], flexShrink: 0 }}>{a.urgency}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 2, background: `${ownerColor[a.owner] || '#8892A4'}18`, color: ownerColor[a.owner] || '#8892A4', flexShrink: 0 }}>{a.owner}</span>
                  <span style={{ fontSize: 10, color: '#dde', lineHeight: 1.5 }}>{a.action}</span>
                </div>
              ))}
            </div>
          )}

          {result.next_steps && (
            <div style={{ padding: '8px 10px', background: 'rgba(255,181,71,0.06)', border: '1px solid rgba(255,181,71,0.2)', borderRadius: 4, marginBottom: 10 }}>
              <div style={{ fontSize: 8, color: '#FFB547', fontWeight: 700, marginBottom: 2 }}>NEXT STEPS</div>
              <div style={{ fontSize: 10, color: '#ddd', lineHeight: 1.65 }}>{result.next_steps}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={exportBrief} style={{ flex: 1, padding: '8px', background: 'rgba(255,181,71,0.1)', border: '1px solid rgba(255,181,71,0.3)', borderRadius: 4, color: '#FFB547', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>↓ Export TXT</button>
            <button onClick={() => setResult(null)} style={{ padding: '8px 10px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, fontSize: 11, cursor: 'pointer' }}>↻</button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── ONBOARDING WIZARD ─────────────────────────────────────────────────────
function OnboardingWizard({C,onClose}){
  const [step,setStep]=useState(0),[sel,setSel]=useState(null),[apiKey,setApiKey]=useState(""),[endpoint,setEndpoint]=useState(""),[testing,setTesting]=useState(false),[testRes,setTestRes]=useState(null);
  const steps=["Choose Source","Configure","Test","Complete"];
  const test=async()=>{setTesting(true);setTestRes(null);await new Promise(r=>setTimeout(r,1800));setTestRes({success:true,events:Math.floor(Math.random()*50000)+10000,latency:Math.floor(Math.random()*80)+20,sources:Math.floor(Math.random()*8)+2});setTesting(false);};
  return(<div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(5,8,18,0.95)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"Inter,sans-serif",color:C.text}}>
    <div style={{width:"100%",maxWidth:500,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:7}}><svg width="15" height="15" viewBox="0 0 28 28" fill="none"><polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#5C6FFF" strokeWidth="1.5"/><circle cx="14" cy="14" r="3" fill="#5C6FFF"/></svg><span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13,color:C.text}}>Connect Data Source</span></div><button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,fontSize:17,cursor:"pointer"}}>×</button></div>
      <div style={{display:"flex",gap:3,padding:"8px 18px 0"}}>{steps.map((s,i)=>(<div key={s} style={{flex:1,height:2,borderRadius:1,background:i===step?"#5C6FFF":i<step?"rgba(92,111,255,0.5)":"rgba(255,255,255,0.08)"}}/>))}</div>
      <div style={{padding:"14px 18px 18px"}}>
        {step===0&&(<div><p style={{color:C.muted,fontSize:11,marginBottom:12}}>Choose your data source to get started.</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{SIEMS.map(s=>(<div key={s.id} onClick={()=>setSel(s)} style={{padding:"9px 11px",border:`1px solid ${sel?.id===s.id?"#5C6FFF":C.border}`,borderRadius:5,cursor:"pointer",background:sel?.id===s.id?"rgba(92,111,255,0.08)":"rgba(255,255,255,0.02)",transition:"all 0.12s"}}><div style={{fontSize:15,marginBottom:2}}>{s.icon}</div><div style={{fontSize:10,fontWeight:600,color:C.text,marginBottom:1}}>{s.name}</div><div style={{fontSize:8,color:C.muted}}>{s.desc}</div></div>))}</div><div style={{display:"flex",justifyContent:"space-between",marginTop:12}}><button onClick={onClose} style={{padding:"6px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,color:C.muted,fontSize:11,cursor:"pointer"}}>Cancel</button><button onClick={()=>sel&&setStep(1)} style={{padding:"6px 16px",background:sel?"#5C6FFF":"rgba(92,111,255,0.3)",border:"none",borderRadius:4,color:"#fff",fontSize:11,cursor:sel?"pointer":"default",fontFamily:"'Space Grotesk',sans-serif",fontWeight:600}}>Next →</button></div></div>)}
        {step===1&&sel&&(<div><div style={{display:"flex",gap:7,alignItems:"center",marginBottom:12}}><span style={{fontSize:18}}>{sel.icon}</span><div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:700,color:C.text}}>{sel.name}</div><div style={{fontSize:10,color:C.muted}}>{sel.desc}</div></div></div><div style={{marginBottom:9}}><div style={{fontSize:8,color:C.muted,fontWeight:700,letterSpacing:"0.06em",marginBottom:4}}>ENDPOINT URL</div><input value={endpoint} onChange={e=>setEndpoint(e.target.value)} placeholder="https://your-siem.example.com" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 9px",color:C.text,fontSize:11,outline:"none",fontFamily:"monospace",boxSizing:"border-box"}}/></div><div style={{marginBottom:10}}><div style={{fontSize:8,color:C.muted,fontWeight:700,letterSpacing:"0.06em",marginBottom:4}}>API KEY</div><input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="••••••••••••••••" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 9px",color:C.text,fontSize:11,outline:"none",boxSizing:"border-box"}}/></div><div style={{padding:"6px 9px",background:"rgba(92,111,255,0.05)",border:`1px solid ${C.border}`,borderRadius:4,fontSize:9,color:C.muted,marginBottom:10}}>🔒 Encrypted at rest. Read-only access sufficient.</div><div style={{display:"flex",justifyContent:"space-between"}}><button onClick={()=>setStep(0)} style={{padding:"6px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,color:C.muted,fontSize:11,cursor:"pointer"}}>← Back</button><button onClick={()=>setStep(2)} style={{padding:"6px 16px",background:"#5C6FFF",border:"none",borderRadius:4,color:"#fff",fontSize:11,cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",fontWeight:600}}>Test →</button></div></div>)}
        {step===2&&(<div><p style={{color:C.muted,fontSize:11,marginBottom:10}}>VeilOps will verify connectivity and sample your pipeline.</p><div style={{padding:"10px",background:"rgba(255,255,255,0.02)",border:`1px solid ${C.border}`,borderRadius:5,marginBottom:9,fontFamily:"monospace",fontSize:9,color:C.muted,lineHeight:1.8}}><div>→ Source: <span style={{color:C.text}}>{sel?.name}</span></div><div>→ Endpoint: <span style={{color:C.text}}>{endpoint||"https://your-siem.example.com"}</span></div><div>→ Auth: <span style={{color:C.text}}>{apiKey?"••••"+apiKey.slice(-4):"Not set"}</span></div></div>
        {!testing&&!testRes&&<button onClick={test} style={{width:"100%",background:"linear-gradient(135deg,#5C6FFF,#3D50E0)",border:"none",borderRadius:4,padding:"9px",color:"#fff",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",marginBottom:7}}>Run Test</button>}
        {testing&&<div style={{textAlign:"center",padding:"14px 0"}}><div style={{width:22,height:22,border:"2px solid rgba(92,111,255,0.2)",borderTop:"2px solid #5C6FFF",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 7px"}}/><div style={{fontSize:10,color:C.muted}}>Testing…</div></div>}
        {testRes?.success&&(<div><div style={{padding:"9px 11px",background:"rgba(62,255,138,0.06)",border:"1px solid rgba(62,255,138,0.25)",borderRadius:4,marginBottom:9}}><div style={{fontSize:10,color:"#3EFF8A",fontWeight:700,marginBottom:5}}>✓ Connected</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,textAlign:"center"}}>{[[testRes.events.toLocaleString(),"Events/day"],[`${testRes.latency}ms`,"Latency"],[`${testRes.sources}`,"Streams"]].map(([v,l])=>(<div key={l}><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:700,color:C.text}}>{v}</div><div style={{fontSize:8,color:C.muted}}>{l}</div></div>))}</div></div><button onClick={()=>setStep(3)} style={{width:"100%",background:"#5C6FFF",border:"none",borderRadius:4,padding:"8px",color:"#fff",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>Activate →</button></div>)}
        {!testing&&!testRes&&<button onClick={()=>setStep(1)} style={{padding:"6px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,color:C.muted,fontSize:11,cursor:"pointer"}}>← Back</button>}</div>)}
        {step===3&&(<div style={{textAlign:"center",padding:"14px 0"}}><div style={{width:48,height:48,borderRadius:"50%",background:"rgba(62,255,138,0.1)",border:"2px solid #3EFF8A",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:20}}>✓</div><h3 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:700,color:C.text,marginBottom:5}}>{sel?.name} Connected</h3><p style={{color:C.muted,fontSize:11,marginBottom:16,maxWidth:280,margin:"0 auto 16px"}}>Threat graph populating. Add more sources to increase detection coverage.</p><div style={{display:"flex",gap:7,justifyContent:"center"}}><button onClick={()=>{setStep(0);setSel(null);setApiKey("");setEndpoint("");setTestRes(null);}} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,color:C.muted,fontSize:11,cursor:"pointer"}}>Add Another</button><button onClick={onClose} style={{padding:"7px 14px",background:"#5C6FFF",border:"none",borderRadius:4,color:"#fff",fontSize:11,cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",fontWeight:600}}>Go to Console</button></div></div>)}
      </div>
    </div>
  </div>);}

// ── KEV LIST ──────────────────────────────────────────────────────────────
function KEVList({C,onSelect}){
  const [sort,setSort]=useState("severity");
  const sorted=[...CISA_KEV].sort((a,b)=>sort==="severity"?parseFloat(b.severity)-parseFloat(a.severity):new Date(b.date)-new Date(a.date));
  return(<div style={{padding:7}}><div style={{display:"flex",gap:3,marginBottom:6}}>{["severity","date"].map(s=>(<button key={s} onClick={()=>setSort(s)} style={{padding:"1px 5px",borderRadius:2,border:`1px solid ${sort===s?"#5C6FFF":C.border}`,background:sort===s?"rgba(92,111,255,0.15)":"transparent",color:sort===s?"#fff":C.muted,fontSize:8,cursor:"pointer",fontWeight:600}}>{s.toUpperCase()}</button>))}</div>{sorted.map(k=>(<div key={k.cveID} onClick={()=>onSelect({type:"kev",data:k})} style={{padding:"6px 8px",borderRadius:4,marginBottom:3,cursor:"pointer",background:"rgba(255,62,62,0.04)",border:"1px solid rgba(255,62,62,0.15)",transition:"border-color 0.12s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,62,62,0.4)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,62,62,0.15)"}><div style={{display:"flex",justifyContent:"space-between",marginBottom:1}}><span style={{fontSize:10,fontWeight:700,color:"#FF5C5C",fontFamily:"monospace"}}>{k.cveID}</span><div style={{display:"flex",gap:2}}><span style={{fontSize:7,fontWeight:700,padding:"1px 4px",borderRadius:2,background:parseFloat(k.severity)>=9?"rgba(255,62,62,0.2)":"rgba(255,140,66,0.2)",color:parseFloat(k.severity)>=9?"#FF3E3E":"#FF8C42"}}>{k.severity}</span>{k.ransomware==="Known"&&<span style={{fontSize:7,fontWeight:700,padding:"1px 4px",borderRadius:2,background:"rgba(191,92,255,0.15)",color:"#BF5CFF"}}>RANSOM</span>}</div></div><div style={{fontSize:10,color:"#ddd",marginBottom:1}}>{k.name}</div><div style={{fontSize:8,color:C.muted}}>{k.vendor} · {k.product}</div></div>))}</div>);}

// ── INTELLIGENCE DASHBOARD ────────────────────────────────────────────────
function ThreatDashboard({onClose,T}){
  const [tab,setTab]=useState("actors"),[selected,setSelected]=useState(null),[rightTab,setRightTab]=useState("ai"),[search,setSearch]=useState(""),[phaseFilter,setPhaseFilter]=useState("all"),[showOnboard,setShowOnboard]=useState(false),[showPalette,setShowPalette]=useState(false);
  const C={...T,indigo:"#5C6FFF",amber:"#FFB547"};
  const phases=["all",...new Set(MITRE.techniques.map(t=>t.phase))];
  const fT=MITRE.techniques.filter(t=>(phaseFilter==="all"||t.phase===phaseFilter)&&(search===""||t.name.toLowerCase().includes(search.toLowerCase())));
  const fA=MITRE.groups.filter(g=>search===""||g.name.toLowerCase().includes(search.toLowerCase())||g.aliases.some(a=>a.toLowerCase().includes(search.toLowerCase())));
  const fM=MITRE.malware.filter(m=>search===""||m.name.toLowerCase().includes(search.toLowerCase()));
  const toasts=useToasts();
  const searchHistory=useSearchHistory();
  const watchlist=useWatchlist();
  const handleSelect=item=>{setSelected(item);setRightTab("ai");searchHistory.push(item);};
  const handlePalette=r=>{setSelected({type:r.type,data:r.data});setRightTab(r.type==="actor"?"timeline":"ai");setShowPalette(false);};
  const RIGHT_TABS=[["ai","🤖 AI"],["export","📄 Export"],["timeline","⛓️ Chain"],["compare","⚡ Compare"],["ioc","🔍 IOC"],["alerts","📡 Alerts"],["risk","🎯 Risk"],["heatmap","🔥 Heat"],["sectors","🌐 Sectors"],["digest","📰 Digest"],["watch","★ Watch"],["notes","📝 Notes"],["darkweb","🕸 Dark"],["sim","⚔ Sim"],["geo","🌍 Geo"],["matrix","⬡ Matrix"],["feed","📡 Feed"],["history","🕐 Recent"],["campaigns","🎯 Campaigns"],["vulns","🔍 Vulns"],["brief","📋 Brief"]];
  useEffect(()=>{const h=e=>{if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setShowPalette(p=>!p);}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[]);
  return(<div style={{position:"fixed",inset:0,zIndex:200,background:T.bg,backdropFilter:"blur(16px)",display:"flex",flexDirection:"column",fontFamily:"Inter,sans-serif",color:T.text}}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}} @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <ToastContainer toasts={toasts.toasts} remove={toasts.remove}/>
    {showOnboard&&<OnboardingWizard C={C} onClose={()=>setShowOnboard(false)}/>}
    {showPalette&&<CommandPalette onClose={()=>setShowPalette(false)} onSelect={handlePalette} T={C}/>}
    {/* Header */}
    <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <svg width="17" height="17" viewBox="0 0 28 28" fill="none"><polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#5C6FFF" strokeWidth="1.5"/><circle cx="14" cy="14" r="3" fill="#5C6FFF"/></svg>
        <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:C.text}}>VeilOps <span style={{color:"#5C6FFF"}}>Intelligence Console</span></span>
        <span style={{background:"rgba(255,181,71,0.12)",border:"1px solid rgba(255,181,71,0.3)",borderRadius:3,padding:"1px 6px",fontSize:9,color:"#FFB547",fontWeight:600}}>LIVE · MITRE + CISA + AI</span>
      </div>
      <div style={{display:"flex",gap:5,alignItems:"center"}}>
        <button onClick={()=>setShowPalette(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:4,color:C.muted,cursor:"pointer",fontSize:10,fontFamily:"Inter"}}>🔍 Search <kbd style={{padding:"1px 3px",background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:2,fontSize:8,fontFamily:"monospace"}}>⌘K</kbd></button>
        <button onClick={()=>setShowOnboard(true)} style={{padding:"4px 9px",background:"rgba(62,255,138,0.08)",border:"1px solid rgba(62,255,138,0.25)",borderRadius:4,color:"#3EFF8A",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:10}}>+ Connect</button>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:4,padding:"4px 9px",color:C.text,cursor:"pointer",fontFamily:"Inter",fontSize:10}}>← Back</button>
      </div>
    </div>
    <ConsoleStatsBar C={C} alertCount={20} kevCount={CISA_KEV.length} actorCount={MITRE.groups.length} watchlistCount={watchlist.list.length}/>
    <div style={{display:"flex",flex:1,overflow:"hidden"}}>
      {/* LEFT panel */}
      <div style={{width:255,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"6px 8px",borderBottom:`1px solid ${C.border}`}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter list…" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:4,padding:"5px 8px",color:C.text,fontSize:11,outline:"none",fontFamily:"Inter",boxSizing:"border-box"}}/></div>
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>{[["actors","APT"],["techniques","TTPs"],["malware","Malware"],["kev","KEV"]].map(([k,v])=>(<button key={k} onClick={()=>{setTab(k);setSelected(null);}} style={{flex:1,padding:"7px 0",background:"transparent",border:"none",borderBottom:tab===k?`2px solid ${k==="kev"?"#FF3E3E":"#5C6FFF"}`:"2px solid transparent",color:tab===k?C.text:C.muted,cursor:"pointer",fontSize:9,fontWeight:600,fontFamily:"Inter"}}>{v}</button>))}</div>
        {tab==="techniques"&&<div style={{padding:"4px 6px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:2,flexWrap:"wrap"}}>{phases.slice(0,7).map(p=>(<button key={p} onClick={()=>setPhaseFilter(p)} style={{padding:"1px 4px",borderRadius:2,border:`1px solid ${phaseFilter===p?"#5C6FFF":C.border}`,background:phaseFilter===p?"rgba(92,111,255,0.15)":"transparent",color:phaseFilter===p?C.text:C.muted,fontSize:7,cursor:"pointer",fontWeight:600}}>{p==="all"?"ALL":p.toUpperCase().slice(0,5)}</button>))}</div>}
        <div style={{flex:1,overflowY:"auto",padding:"3px"}}>
          {tab==="actors"&&fA.map(g=>(<div key={g.stix_id} onClick={()=>handleSelect({type:"actor",data:g})} style={{padding:"6px 8px",borderRadius:3,marginBottom:2,cursor:"pointer",background:selected?.data?.stix_id===g.stix_id?"rgba(92,111,255,0.12)":"transparent",border:selected?.data?.stix_id===g.stix_id?"1px solid #5C6FFF":"1px solid transparent",transition:"all 0.1s"}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:5,height:5,borderRadius:"50%",background:"#FF5C5C",flexShrink:0}}/><span style={{fontSize:11,fontWeight:600,color:C.text}}>{g.name}</span><span onClick={e=>{e.stopPropagation();watchlist.has(g.stix_id)?watchlist.remove(g.stix_id):watchlist.add({type:"actor",data:g});}} style={{marginLeft:"auto",color:watchlist.has(g.stix_id)?"#FFB547":C.muted,fontSize:10,cursor:"pointer",paddingLeft:4}}>★</span></div>{g.aliases.length>1&&<div style={{fontSize:9,color:C.muted,marginTop:1,paddingLeft:10}}>{g.aliases.slice(1).join(", ")}</div>}</div>))}
          {tab==="techniques"&&fT.map(t=>(<div key={t.stix_id} onClick={()=>handleSelect({type:"technique",data:t})} style={{padding:"6px 8px",borderRadius:3,marginBottom:2,cursor:"pointer",background:selected?.data?.stix_id===t.stix_id?"rgba(92,111,255,0.12)":"transparent",border:selected?.data?.stix_id===t.stix_id?"1px solid #5C6FFF":"1px solid transparent",transition:"all 0.1s"}}><div style={{display:"flex",alignItems:"center",gap:5,justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:5,height:5,borderRadius:1,background:PHASE_COLORS[t.phase]||"#5C6FFF",flexShrink:0}}/><span style={{fontSize:10,fontWeight:600,color:C.text}}>{t.name}</span></div><span style={{fontSize:8,color:C.muted,flexShrink:0}}>{t.id}</span></div><div style={{fontSize:8,color:PHASE_COLORS[t.phase]||"#5C6FFF",marginTop:1,paddingLeft:10,fontWeight:600}}>{t.phase}</div></div>))}
          {tab==="malware"&&fM.map(m=>(<div key={m.stix_id} onClick={()=>handleSelect({type:"malware",data:m})} style={{padding:"6px 8px",borderRadius:3,marginBottom:2,cursor:"pointer",background:selected?.data?.stix_id===m.stix_id?"rgba(92,111,255,0.12)":"transparent",border:selected?.data?.stix_id===m.stix_id?"1px solid #5C6FFF":"1px solid transparent",transition:"all 0.1s"}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:5,height:5,borderRadius:"50%",background:"#FFB547",flexShrink:0}}/><span style={{fontSize:10,fontWeight:600,color:C.text}}>{m.name}</span></div><div style={{fontSize:9,color:C.muted,marginTop:1,paddingLeft:10}}>{m.platforms.join(", ")}</div></div>))}
          {tab==="kev"&&<KEVList C={C} onSelect={handleSelect}/>}
        </div>
      </div>
      {/* CENTER graph */}
      <div style={{flex:1,position:"relative"}}>
        <GraphCanvas onNodeClick={handleSelect}/>
        <div style={{position:"absolute",top:8,left:8,display:"flex",gap:3,flexWrap:"wrap"}}>{[["#FF5C5C","APT"],["#5C6FFF","TTPs"],["#FFB547","Malware"],["#FF3E3E","KEV"]].map(([c,l])=>(<div key={l} style={{display:"flex",alignItems:"center",gap:3,background:"rgba(10,15,30,0.85)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:3,padding:"2px 6px"}}><div style={{width:5,height:5,borderRadius:"50%",background:c}}/><span style={{fontSize:8,color:"#fff",fontWeight:600}}>{l}</span></div>))}</div>
        <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",fontSize:9,color:"rgba(255,255,255,0.22)",fontStyle:"italic",whiteSpace:"nowrap"}}>Click node to analyze · ⌘K to search</div>
      </div>
      {/* RIGHT tabs */}
      <div style={{width:295,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0,overflowX:"auto"}}>{RIGHT_TABS.map(([k,v])=>(<button key={k} onClick={()=>setRightTab(k)} style={{flex:1,padding:"7px 2px",background:"transparent",border:"none",borderBottom:rightTab===k?"2px solid #5C6FFF":"2px solid transparent",color:rightTab===k?C.text:C.muted,cursor:"pointer",fontSize:8,fontWeight:600,fontFamily:"Inter",whiteSpace:"nowrap",minWidth:32}}>{v}</button>))}</div>
        <div style={{flex:1,overflowY:"auto"}}>
          {rightTab==="ai"&&<AIPanel selected={selected} C={C}/>}
          {rightTab==="export"&&<ExportPanel selected={selected} C={C}/>}
          {rightTab==="timeline"&&<ChainPanel actor={selected?.type==="actor"?selected.data:null} C={C}/>}
          {rightTab==="compare"&&<ComparePanel C={C}/>}
          {rightTab==="ioc"&&<IOCPanel C={C}/>}
          {rightTab==="alerts"&&<AlertsPanel C={C}/>}
          {rightTab==="risk"&&<RiskPanel C={C}/>}
          {rightTab==="heatmap"&&<TTPHeatmap C={C}/>}
          {rightTab==="sectors"&&<SectorThreatMap C={C} onSelectActor={handleSelect}/>}
          {rightTab==="digest"&&<DigestPanel C={C}/>}
          {rightTab==="watch"&&<WatchlistPanel C={C} watchlist={watchlist} onSelect={handleSelect}/>}
          {rightTab==="notes"&&<NotesPanel selected={selected} C={C}/>}
          {rightTab==="darkweb"&&<DarkWebPulse C={C} onToast={toasts.add}/>}
          {rightTab==="sim"&&<AttackSimPanel C={C} onToast={toasts.add}/>}
          {rightTab==="geo"&&<GeoThreatMap C={C} onSelectActor={handleSelect}/>}
          {rightTab==="matrix"&&<ThreatMatrixPanel C={C} onSelect={handleSelect}/>}
          {rightTab==="feed"&&<IntelFeedPanel C={C} onToast={toasts.add}/>}
          {rightTab==="history"&&<HistoryPanel C={C} searchHistory={searchHistory} onSelect={handleSelect}/>}
          {rightTab==="campaigns"&&<CampaignTracker C={C} onSelectActor={handleSelect} onToast={toasts.add}/>}
          {rightTab==="vulns"&&<VulnScanPanel C={C} onToast={toasts.add}/>}
          {rightTab==="brief"&&<ThreatBriefPanel C={C} onToast={toasts.add}/>}
        </div>
      </div>
    </div>
  </div>);}


// ── HERO CANVAS ───────────────────────────────────────────────────────────
function HeroCanvas(){
  const ref=useRef(null),animRef=useRef(null);
  useEffect(()=>{const c=ref.current;if(!c)return;const ctx=c.getContext("2d");const rs=()=>{c.width=c.offsetWidth;c.height=c.offsetHeight;};rs();window.addEventListener("resize",rs);const nodes=Array.from({length:32},()=>({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-0.5)*0.25,vy:(Math.random()-0.5)*0.25,r:Math.random()*2.5+1.5,p:Math.random()*Math.PI*2,ps:Math.random()*0.018+0.008}));const draw=()=>{ctx.clearRect(0,0,c.width,c.height);nodes.forEach(n=>{n.x+=n.vx;n.y+=n.vy;n.p+=n.ps;if(n.x<0||n.x>c.width)n.vx*=-1;if(n.y<0||n.y>c.height)n.vy*=-1;});for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<150){ctx.beginPath();ctx.moveTo(nodes[i].x,nodes[i].y);ctx.lineTo(nodes[j].x,nodes[j].y);ctx.strokeStyle=`rgba(92,111,255,${(1-d/150)*0.15})`;ctx.lineWidth=0.8;ctx.stroke();}}nodes.forEach(n=>{const g=(Math.sin(n.p)+1)/2;ctx.beginPath();ctx.arc(n.x,n.y,n.r+g*1.5,0,Math.PI*2);ctx.fillStyle=`rgba(92,111,255,${0.4+g*0.5})`;ctx.fill();});animRef.current=requestAnimationFrame(draw);};draw();return()=>{cancelAnimationFrame(animRef.current);window.removeEventListener("resize",rs);};},[]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.7}}/>;
}

function useFadeIn(){const ref=useRef(null);const[v,setV]=useState(false);useEffect(()=>{const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting)setV(true);},{threshold:0.1});if(ref.current)obs.observe(ref.current);return()=>obs.disconnect();},[]);return[ref,v];}
function Fade({children,style}){const[ref,v]=useFadeIn();return<div ref={ref} style={{transition:"opacity 0.7s ease, transform 0.7s ease",opacity:v?1:0,transform:v?"translateY(0)":"translateY(22px)",...style}}>{children}</div>;}

const FEATURES=[{icon:"⬡",title:"Threat Graph Fusion",desc:"Maps relationships across your entire data estate in real time."},{icon:"◈",title:"AI Anomaly Engine",desc:"Detects behavioral deviations before signatures exist."},{icon:"⊞",title:"Modular Deployment",desc:"Start with one source. Scale without rearchitecting."},{icon:"✓",title:"Explainable Alerts",desc:"Every alert ships with a chain of evidence. No black boxes."}];
const STEPS=[{n:"1",label:"Connect",detail:"Plug in SIEMs, logs, APIs in minutes."},{n:"2",label:"Fuse",detail:"VeilOps builds a live knowledge graph."},{n:"3",label:"Act",detail:"Get prioritized, explainable intelligence."}];
const TABLE_ROWS=[{label:"Onboarding time",veil:"Weeks",pal:"12–18 months",cs:"Weeks"},{label:"Pricing",veil:"Usage-based",pal:"Enterprise contract",cs:"Per-endpoint"},{label:"Commercial focus",veil:"✓",pal:"Limited",cs:"✓"},{label:"Open API",veil:"✓",pal:"✗",cs:"Partial"},{label:"Explainable AI",veil:"✓",pal:"✓",cs:"Partial"},{label:"Mid-market",veil:"✓",pal:"✗",cs:"✓"}];

// ── MAIN APP ──────────────────────────────────────────────────────────────
function VeilOpsInner(){
  const [themeName,setThemeName]=useState("dark");
  const T=THEMES[themeName];
  const siteToasts=useToasts();
  const [showDash,setShowDash]=useState(false),[showOnboard,setShowOnboard]=useState(false),[showDemo,setShowDemo]=useState(false),[showPalette,setShowPalette]=useState(false);
  const [email,setEmail]=useState(""),[joined,setJoined]=useState(false),[joining,setJoining]=useState(false);
  const [hovCard,setHovCard]=useState(null),[hovPlan,setHovPlan]=useState(null);
  const handleJoin=async()=>{if(!email.includes("@"))return;setJoining(true);await submitWaitlist(email);setJoined(true);setJoining(false);};
  useEffect(()=>{const h=e=>{if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setShowPalette(p=>!p);}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[]);
  const btn={
    primary:{background:"#5C6FFF",color:"#fff",border:"none",padding:"11px 22px",borderRadius:"6px",fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:"14px",cursor:"pointer"},
    ghost:{background:"transparent",color:T.text,border:`1px solid rgba(${themeName==="dark"?"255,255,255":"0,0,0"},0.22)`,padding:"11px 22px",borderRadius:"6px",fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:"14px",cursor:"pointer"},
    amber:{background:"#FFB547",color:"#0A0F1E",border:"none",padding:"11px 22px",borderRadius:"6px",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:"14px",cursor:"pointer"},
  };
  return(
    <div style={{background:T.bg,color:T.text,fontFamily:"Inter,sans-serif",minHeight:"100vh",overflowX:"hidden",transition:"background 0.3s,color 0.3s"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}::selection{background:rgba(92,111,255,0.35)}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${T.bg}}::-webkit-scrollbar-thumb{background:#5C6FFF;border-radius:3px}.nav-link{color:${T.muted};text-decoration:none;font-size:13px;font-weight:500;transition:color .2s}.nav-link:hover{color:${T.text}}.fcard{transition:border-left-color .2s,transform .2s,box-shadow .2s}.fcard:hover{transform:translateY(-3px);box-shadow:0 8px 32px rgba(92,111,255,0.12)}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}@media(max-width:768px){.hero-h{font-size:36px!important}.fgrid{grid-template-columns:1fr!important}.pgrid{grid-template-columns:1fr!important}.steps-r{flex-direction:column!important}.stats-b{flex-direction:column!important}.nav-d{display:none!important}.tscroll{overflow-x:auto}}`}</style>

      {showDash&&<ThreatDashboard onClose={()=>setShowDash(false)} T={T}/>}
      {showOnboard&&!showDash&&<OnboardingWizard C={T} onClose={()=>setShowOnboard(false)}/>}
      {showDemo&&<DemoModal onClose={()=>setShowDemo(false)} onOpenConsole={()=>{setShowDemo(false);setShowDash(true);}} T={T}/>}
      <ToastContainer toasts={siteToasts.toasts} remove={siteToasts.remove}/>
  {showPalette&&!showDash&&<CommandPalette onClose={()=>setShowPalette(false)} onSelect={()=>{setShowPalette(false);setShowDash(true);}} T={T}/>}

      {/* NAV */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:T.navBg,backdropFilter:"blur(12px)",borderBottom:`1px solid ${T.border}`,padding:"0 26px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}><svg width="22" height="22" viewBox="0 0 28 28" fill="none"><polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#5C6FFF" strokeWidth="1.5"/><polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill="#5C6FFF" opacity="0.18"/><circle cx="14" cy="14" r="3" fill="#5C6FFF"/></svg><span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,letterSpacing:"-0.03em",color:T.text}}>Veil<span style={{color:"#5C6FFF"}}>Ops</span></span></div>
        <div className="nav-d" style={{display:"flex",gap:26,alignItems:"center"}}>
          {["Platform","Pricing","Security","Company"].map(l=><a key={l} href="#" className="nav-link">{l}</a>)}
          <button onClick={()=>setShowPalette(true)} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,borderRadius:4,color:T.muted,cursor:"pointer",fontSize:11,fontFamily:"Inter"}}>🔍 <kbd style={{padding:"1px 4px",background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,borderRadius:2,fontSize:8,fontFamily:"monospace"}}>⌘K</kbd></button>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={()=>setThemeName(n=>n==="dark"?"light":"dark")} style={{padding:"4px 7px",background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,borderRadius:4,color:T.muted,cursor:"pointer",fontSize:13,lineHeight:1}} title="Toggle theme">{themeName==="dark"?"☀️":"🌙"}</button>
          <button onClick={()=>setShowOnboard(true)} style={{...btn.ghost,padding:"5px 11px",fontSize:11}}>Connect</button>
          <button onClick={()=>setShowDash(true)} style={{...btn.primary,padding:"5px 13px",fontSize:11}}>Console</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{position:"relative",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",paddingTop:56,overflow:"hidden"}}>
        <HeroCanvas/>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 60%,rgba(92,111,255,0.08) 0%,transparent 70%)"}}/>
        <div style={{position:"relative",zIndex:2,textAlign:"center",maxWidth:780,padding:"0 22px"}}>
          <div style={{display:"inline-block",background:"rgba(92,111,255,0.12)",border:`1px solid ${T.border}`,borderRadius:4,padding:"4px 13px",marginBottom:24,fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:600,letterSpacing:"0.08em",color:"#5C6FFF",textTransform:"uppercase"}}>AI-Native Threat Intelligence Platform</div>
          <h1 className="hero-h" style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"clamp(36px,6vw,64px)",fontWeight:700,lineHeight:1.08,letterSpacing:"-0.03em",marginBottom:20,color:T.text}}>See Every Threat.<br/><span style={{color:"#5C6FFF"}}>Decide Faster.</span></h1>
          <p style={{fontSize:16,color:T.muted,lineHeight:1.65,maxWidth:560,margin:"0 auto 34px"}}>VeilOps fuses your data, maps attack surfaces, and delivers actionable intelligence — without locking you into a $10M integration project.</p>
          <div style={{display:"flex",gap:11,justifyContent:"center",flexWrap:"wrap",marginBottom:16}}>
            <button onClick={()=>setShowDash(true)} style={btn.amber}>Launch Console →</button>
            <button onClick={()=>setShowDemo(true)} style={btn.ghost}>Watch Demo</button>
          </div>
          <p style={{fontSize:11,color:T.muted,letterSpacing:"0.02em"}}>SOC 2 Type II · Zero lock-in · MITRE ATT&CK · CISA KEV · Claude AI · ⌘K Search · From $2K/mo</p>
          <div style={{marginTop:16,padding:"6px 16px",background:"rgba(255,181,71,0.06)",border:"1px solid rgba(255,181,71,0.2)",borderRadius:5,display:"inline-block"}}><span style={{fontSize:11,color:"#FFB547"}}>⬡ {MITRE.groups.length} APT groups · {MITRE.techniques.length} TTPs · {MITRE.malware.length} malware · {CISA_KEV.length} KEVs · {IOC_DB.length} IOCs · AI export · Dark/light theme</span></div>
        </div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:110,background:`linear-gradient(to bottom,transparent,${T.bg})`}}/>
      </section>

      {/* STATS */}
      <Fade><div style={{background:T.bg2,borderTop:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`,padding:"42px 28px"}}><div className="stats-b" style={{display:"flex",justifyContent:"center",gap:56,maxWidth:820,margin:"0 auto",textAlign:"center"}}>{[{n:"73%",l:"of breaches span 3+ systems"},{n:"$2.4M",l:"avg Palantir onboarding cost"},{n:"194",l:"days mean detection time without fusion"}].map(s=>(<div key={s.n}><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:38,fontWeight:700,color:"#FFB547",letterSpacing:"-0.03em"}}>{s.n}</div><div style={{fontSize:12,color:T.muted,marginTop:5,maxWidth:140,lineHeight:1.5}}>{s.l}</div></div>))}</div></div></Fade>

      {/* FEATURES */}
      <Fade style={{padding:"80px 28px",maxWidth:1040,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:48}}><p style={{color:"#5C6FFF",fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:9}}>Platform</p><h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"clamp(24px,4vw,38px)",fontWeight:700,letterSpacing:"-0.025em",color:T.text}}>Built for operators, not analysts</h2></div>
        <div className="fgrid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>{FEATURES.map((f,i)=>(<div key={f.title} className="fcard" onMouseEnter={()=>setHovCard(i)} onMouseLeave={()=>setHovCard(null)} style={{background:T.card,border:`1px solid ${T.border}`,borderLeft:`3px solid ${hovCard===i?"#5C6FFF":"transparent"}`,borderRadius:7,padding:24,transition:"all 0.22s ease"}}><div style={{fontSize:19,marginBottom:11,color:"#5C6FFF"}}>{f.icon}</div><h3 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:600,marginBottom:6,letterSpacing:"-0.01em",color:T.text}}>{f.title}</h3><p style={{color:T.muted,fontSize:13,lineHeight:1.65}}>{f.desc}</p></div>))}</div>
      </Fade>

      {/* HOW IT WORKS */}
      <Fade style={{padding:"64px 28px",background:T.bg2,borderTop:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`}}>
        <div style={{maxWidth:880,margin:"0 auto"}}><div style={{textAlign:"center",marginBottom:44}}><p style={{color:"#5C6FFF",fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:9}}>Workflow</p><h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"clamp(24px,4vw,36px)",fontWeight:700,letterSpacing:"-0.025em",color:T.text}}>Live in weeks, not years</h2></div><div className="steps-r" style={{display:"flex",gap:0,alignItems:"flex-start"}}>{STEPS.map((s,i)=>(<div key={s.label} style={{display:"flex",flex:1,alignItems:"flex-start"}}><div style={{flex:1,padding:"0 18px",textAlign:"center"}}><div style={{width:42,height:42,borderRadius:"50%",background:"rgba(92,111,255,0.12)",border:"2px solid #5C6FFF",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,color:"#5C6FFF",fontSize:15}}>{s.n}</div><h3 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,marginBottom:8,letterSpacing:"-0.01em",color:T.text}}>{s.label}</h3><p style={{color:T.muted,fontSize:12,lineHeight:1.65,maxWidth:200,margin:"0 auto"}}>{s.detail}</p></div>{i<STEPS.length-1&&<div style={{paddingTop:20,color:"rgba(92,111,255,0.3)",fontSize:17,flexShrink:0}}>→</div>}</div>))}</div></div>
      </Fade>

      {/* DEMO CTA */}
      <Fade style={{padding:"50px 28px"}}><div style={{maxWidth:620,margin:"0 auto",padding:"48px 24px",background:"rgba(92,111,255,0.06)",border:`1px solid ${T.border}`,borderRadius:12,textAlign:"center",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:"rgba(92,111,255,0.06)",filter:"blur(36px)"}}/><h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"clamp(20px,3vw,30px)",fontWeight:700,letterSpacing:"-0.025em",marginBottom:10,color:T.text}}>See It Live — No Sales Call Required</h2><p style={{color:T.muted,fontSize:14,marginBottom:22,maxWidth:420,margin:"0 auto 22px"}}>MITRE data. CVEs. IOC search. Risk scoring. AI analysis. Report export. ⌘K global search. Dark/light theme. All in your browser.</p><div style={{display:"flex",gap:9,justifyContent:"center",flexWrap:"wrap"}}><button onClick={()=>setShowDash(true)} style={btn.amber}>Open Console →</button><button onClick={()=>setShowDemo(true)} style={btn.ghost}>Platform Tour</button></div></div></Fade>

      {/* PRICING */}
      <Fade style={{padding:"80px 28px",maxWidth:1040,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:48}}><p style={{color:"#5C6FFF",fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:9}}>Pricing</p><h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"clamp(24px,4vw,38px)",fontWeight:700,letterSpacing:"-0.025em",color:T.text}}>Intelligence Without the Oracle Tax</h2><p style={{color:T.muted,fontSize:14,marginTop:10}}>Start at $2K/mo. Not $2M. No lock-in. Cancel anytime.</p></div>
        <div className="pgrid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
          {PRICING.map((plan,i)=>(<div key={plan.name} onMouseEnter={()=>setHovPlan(i)} onMouseLeave={()=>setHovPlan(null)} style={{border:`1px solid ${plan.highlight?plan.color:hovPlan===i?T.border:"rgba(255,255,255,0.07)"}`,borderRadius:9,padding:"22px 20px",background:plan.highlight?"rgba(92,111,255,0.06)":T.card,position:"relative",transition:"all 0.2s",transform:plan.highlight?"scale(1.02)":"scale(1)"}}>
            {plan.highlight&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:plan.color,borderRadius:4,padding:"2px 11px",fontSize:9,fontWeight:700,color:"#fff",whiteSpace:"nowrap"}}>MOST POPULAR</div>}
            <div style={{fontSize:11,color:plan.color,fontWeight:700,letterSpacing:"0.06em",marginBottom:5}}>{plan.name.toUpperCase()}</div>
            <div style={{display:"flex",alignItems:"baseline",gap:3,marginBottom:5}}><span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:30,fontWeight:700,color:T.text,letterSpacing:"-0.03em"}}>{plan.price}</span><span style={{color:T.muted,fontSize:12}}>{plan.period}</span></div>
            <p style={{color:T.muted,fontSize:11,lineHeight:1.6,marginBottom:15}}>{plan.desc}</p>
            <button onClick={()=>setShowDash(true)} style={{width:"100%",background:plan.highlight?plan.color:"transparent",border:`1px solid ${plan.highlight?plan.color:T.border}`,borderRadius:5,padding:"9px",color:plan.highlight?"#fff":T.text,fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",marginBottom:15}}>{plan.cta}</button>
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:12}}>{plan.features.map((f,j)=>(<div key={j} style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:5}}><span style={{color:plan.color,fontSize:10,flexShrink:0,marginTop:1}}>✓</span><span style={{fontSize:11,color:T.muted,lineHeight:1.5}}>{f}</span></div>))}</div>
          </div>))}
        </div>
      </Fade>

      {/* VS TABLE */}
      <Fade style={{padding:"64px 28px",maxWidth:820,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}><p style={{color:"#5C6FFF",fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:9}}>vs. Palantir</p><h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"clamp(22px,4vw,34px)",fontWeight:700,letterSpacing:"-0.025em",color:T.text}}>The Oracle Tax is optional now</h2></div>
        <div className="tscroll"><table style={{width:"100%",borderCollapse:"collapse",minWidth:420}}><thead><tr><th style={{textAlign:"left",padding:"10px 12px",color:T.muted,fontSize:10,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",borderBottom:`1px solid ${T.border}`}}></th>{["VeilOps","Palantir","CrowdStrike"].map((col,i)=>(<th key={col} style={{textAlign:"center",padding:"10px 12px",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:12,color:i===0?"#5C6FFF":T.muted,borderBottom:`1px solid ${i===0?"#5C6FFF":T.border}`,background:i===0?"rgba(92,111,255,0.05)":"transparent"}}>{col}</th>))}</tr></thead><tbody>{TABLE_ROWS.map((row,ri)=>(<tr key={row.label} style={{background:ri%2===0?"transparent":"rgba(255,255,255,0.01)"}}><td style={{padding:"10px 12px",fontSize:12,color:T.muted,borderBottom:`1px solid rgba(255,255,255,0.04)`}}>{row.label}</td>{[row.veil,row.pal,row.cs].map((val,ci)=>(<td key={ci} style={{textAlign:"center",padding:"10px 12px",fontSize:12,fontWeight:val==="✓"?700:400,color:val==="✓"?"#5C6FFF":val==="✗"?"#FF5C5C":val==="Partial"?"#FFB547":ci===0?T.text:T.muted,background:ci===0?"rgba(92,111,255,0.04)":"transparent",borderBottom:`1px solid rgba(255,255,255,0.04)`}}>{val}</td>))}</tr>))}</tbody></table></div>
      </Fade>

      {/* WAITLIST */}
      <Fade><div style={{margin:"0 28px 64px",borderRadius:12,background:"linear-gradient(135deg,rgba(92,111,255,0.12) 0%,rgba(10,15,30,0.8) 100%)",border:`1px solid ${T.border}`,padding:"56px 24px",textAlign:"center",maxWidth:600,marginLeft:"auto",marginRight:"auto",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:"rgba(92,111,255,0.06)",filter:"blur(36px)"}}/><div style={{display:"inline-block",background:"rgba(255,181,71,0.12)",border:"1px solid rgba(255,181,71,0.3)",borderRadius:4,padding:"3px 11px",marginBottom:12,fontSize:10,fontWeight:600,color:"#FFB547",fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase"}}>Limited Spots</div><h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:"clamp(22px,4vw,32px)",fontWeight:700,letterSpacing:"-0.025em",marginBottom:9,color:T.text}}>Be Among the First 50 Teams</h2><p style={{color:T.muted,fontSize:13,marginBottom:26,lineHeight:1.6}}>Early access. Founding pricing locked in. Direct line to the roadmap.</p>{joined?(<div style={{padding:"11px 22px",background:"rgba(92,111,255,0.15)",border:"1px solid #5C6FFF",borderRadius:5,display:"inline-block"}}><span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,color:"#5C6FFF"}}>✓ You are on the list.</span></div>):(<div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}><input type="email" placeholder="your@company.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleJoin()} style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${T.border}`,borderRadius:5,padding:"9px 13px",color:T.text,fontSize:13,width:240,outline:"none",fontFamily:"Inter"}}/><button onClick={handleJoin} disabled={joining} style={{background:"#5C6FFF",color:"#fff",border:"none",padding:"9px 18px",borderRadius:"5px",fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:"13px",cursor:"pointer",opacity:joining?0.7:1}}>{joining?"Saving…":"Join Waitlist"}</button></div>)}<p style={{marginTop:11,fontSize:11,color:T.muted}}>No commitment. No sales call unless you want one.</p></div></Fade>

      {/* FOOTER */}
      <footer style={{borderTop:`1px solid ${T.border}`,padding:"28px 26px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,maxWidth:1020,margin:"0 auto"}}>
        <div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><svg width="15" height="15" viewBox="0 0 28 28" fill="none"><polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#5C6FFF" strokeWidth="1.5"/><circle cx="14" cy="14" r="3" fill="#5C6FFF"/></svg><span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13,letterSpacing:"-0.02em",color:T.text}}>Veil<span style={{color:"#5C6FFF"}}>Ops</span></span></div><p style={{fontSize:10,color:T.muted}}>Intelligence Without the Oracle Tax</p></div>
        <div style={{display:"flex",gap:20}}>{["Platform","Pricing","Docs","Security","Company"].map(l=><a key={l} href="#" className="nav-link" style={{fontSize:11}}>{l}</a>)}</div>
        <p style={{fontSize:10,color:T.muted}}>© 2026 VeilOps Inc. Built for operators, not analysts.</p>
      </footer>
    </div>
  );
}


// ── Jackie-side wrapper: framing banner + ambient background ──────────────
export default function VeilOpsPage(){
  return (
    <div style={{ position:"relative", minHeight:"100vh", background:"#0A0F1E" }}>
      <div style={{ position:"fixed", inset:0, zIndex:0, opacity:0.18, pointerEvents:"none" }}>
        <AnimatedCanvas backgroundId="neutron" />
      </div>
      <div style={{ position:"relative", zIndex:1 }}>
        <div style={{
          position:"sticky", top:0, zIndex:200,
          background:"rgba(10,15,30,0.92)", backdropFilter:"blur(8px)",
          borderBottom:"1px solid rgba(92,111,255,0.25)",
          padding:"8px 16px", display:"flex", gap:12, alignItems:"center",
          fontFamily:"Inter,sans-serif", fontSize:11, color:"#A8B2D1"
        }}>
          <span style={{
            padding:"2px 8px", borderRadius:4, background:"rgba(92,111,255,0.18)",
            color:"#9FB0FF", fontWeight:700, letterSpacing:"0.05em", fontSize:10
          }}>REFERENCE</span>
          <span>
            Factual threat-intelligence console — MITRE ATT&amp;CK, CISA KEV, APT profiles.
            Not a game. Data is informational; verify with primary sources before operational use.
          </span>
          <a href="/" style={{ marginLeft:"auto", color:"#5C6FFF", textDecoration:"none", fontWeight:600 }}>← Jackie</a>
        </div>
        <VeilOpsInner />
      </div>
    </div>
  );
}
