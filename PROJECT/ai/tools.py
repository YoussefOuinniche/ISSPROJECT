# These are the 4 tools the AI can use:
# 1. web_scrape      - get live IT job data from websites
# 2. analyze_results - look through the data and find patterns
# 3. generate_report - turn findings into a readable report
# 4. generate_chart  - make a chart image from data

import base64
import io
import matplotlib
matplotlib.use("Agg")  # this stops matplotlib from trying to open a window
import matplotlib.pyplot as plt

# i had to look up what this does - it basically makes charts work
# without needing a screen/display, good for servers


# --- TOOL 1: WEB SCRAPE ---
def tool_web_scrape(query, per_source_limit=5):
    # import our scraper file
    from scraper import scrape_it_jobs_data

    try:
        raw_results = scrape_it_jobs_data(query, per_source_limit)

        # trim the body text so it doesnt get too long
        trimmed = []
        for result in raw_results:
            short_body = result["body"][:400]  # only first 400 characters
            new_item = {
                "title": result["title"],
                "href": result["href"],
                "body": short_body
            }
            trimmed.append(new_item)

        return {
            "success": True,
            "count": len(trimmed),
            "results": trimmed
        }

    except Exception as error:
        print("Error in tool_web_scrape:", error)
        return {
            "success": False,
            "error": str(error),
            "results": []
        }


# --- TOOL 2: ANALYZE RESULTS ---
def tool_analyze_results(data, analysis_type="frequency"):
    try:
        # check we actually got data
        if len(data) == 0:
            return {"success": False, "error": "No data provided for analysis."}

        # --- FREQUENCY ANALYSIS ---
        # count how often tech keywords appear in the text
        if analysis_type == "frequency":
            # check all items have a body field
            has_body = True
            for item in data:
                if "body" not in item:
                    has_body = False
                    break

            if not has_body:
                return {"success": False, "error": "Data has no 'body' column for frequency analysis."}

            # join all body text together into one big string
            all_text = ""
            for item in data:
                body = item.get("body", "")
                if body is not None:
                    all_text = all_text + " " + body.lower()

            # list of tech words to look for
            tech_keywords = [
                "python", "javascript", "typescript", "java", "go", "rust",
                "react", "node", "docker", "kubernetes", "aws", "azure",
                "machine learning", "ai", "data", "sql", "devops", "cloud",
                "security", "linux", "git", "api"
            ]

            # count how many times each keyword appears
            freq = {}
            for keyword in tech_keywords:
                count = all_text.count(keyword)
                if count > 0:
                    freq[keyword] = count

            # sort by count, highest first
            # i learned this trick - make a list of pairs, sort it, rebuild dict
            pairs = []
            for keyword in freq:
                pairs.append((keyword, freq[keyword]))

            # bubble sort by count descending
            i = 0
            while i < len(pairs):
                j = 0
                while j < len(pairs) - 1 - i:
                    if pairs[j][1] < pairs[j + 1][1]:
                        temp = pairs[j]
                        pairs[j] = pairs[j + 1]
                        pairs[j + 1] = temp
                    j = j + 1
                i = i + 1

            # rebuild as dict
            sorted_freq = {}
            for pair in pairs:
                sorted_freq[pair[0]] = pair[1]

            return {
                "success": True,
                "analysis_type": "frequency",
                "keyword_frequency": sorted_freq,
                "total_documents": len(data)
            }

        # --- GAP ANALYSIS ---
        # look at skill gaps and group them by domain
        if analysis_type == "gap":
            # check required fields exist
            has_fields = True
            for item in data:
                if "gap_level" not in item or "domain" not in item:
                    has_fields = False
                    break

            if not has_fields:
                return {"success": False, "error": "Data must have 'gap_level' and 'domain' columns."}

            # group gaps by domain and calculate average gap level
            domain_totals = {}
            domain_counts = {}

            for item in data:
                domain = item.get("domain", "Unknown")

                # try to convert gap_level to a number
                try:
                    gap_level = float(item.get("gap_level", 0))
                except Exception:
                    gap_level = 0.0

                if domain not in domain_totals:
                    domain_totals[domain] = 0.0
                    domain_counts[domain] = 0

                domain_totals[domain] = domain_totals[domain] + gap_level
                domain_counts[domain] = domain_counts[domain] + 1

            # calculate averages
            by_domain = {}
            for domain in domain_totals:
                average = domain_totals[domain] / domain_counts[domain]
                by_domain[domain] = round(average, 2)

            # find top 5 highest gap_level items
            # sort all items by gap_level descending
            sorted_data = []
            for item in data:
                sorted_data.append(item)

            # simple selection sort to get top 5
            i = 0
            while i < len(sorted_data) - 1:
                max_index = i
                j = i + 1
                while j < len(sorted_data):
                    try:
                        val_j = float(sorted_data[j].get("gap_level", 0))
                        val_max = float(sorted_data[max_index].get("gap_level", 0))
                        if val_j > val_max:
                            max_index = j
                    except Exception:
                        pass
                    j = j + 1

                temp = sorted_data[i]
                sorted_data[i] = sorted_data[max_index]
                sorted_data[max_index] = temp
                i = i + 1

            # grab the top 5 and only keep the fields we care about
            top_gaps = []
            count = 0
            for item in sorted_data:
                if count >= 5:
                    break
                top_item = {
                    "skill_name": item.get("skill_name", ""),
                    "domain": item.get("domain", ""),
                    "gap_level": item.get("gap_level", 0),
                    "reason": item.get("reason", "")
                }
                top_gaps.append(top_item)
                count = count + 1

            return {
                "success": True,
                "analysis_type": "gap",
                "average_gap_by_domain": by_domain,
                "top_5_critical_gaps": top_gaps
            }

        # --- TREND ANALYSIS ---
        # count how many results came from each source
        if analysis_type == "trend":
            source_counts = {}

            for item in data:
                title = item.get("title", "")
                # source names are in square brackets like [BLS OOH]
                source_name = ""
                if "[" in title and "]" in title:
                    start = title.find("[")
                    end = title.find("]")
                    source_name = title[start + 1: end]

                if source_name != "":
                    if source_name not in source_counts:
                        source_counts[source_name] = 0
                    source_counts[source_name] = source_counts[source_name] + 1

            # figure out what columns are in the data
            all_columns = []
            for item in data:
                for key in item:
                    if key not in all_columns:
                        all_columns.append(key)

            return {
                "success": True,
                "analysis_type": "trend",
                "source_distribution": source_counts,
                "total_results": len(data),
                "columns_available": all_columns
            }

        # --- FALLBACK: just count rows and columns ---
        all_columns = []
        for item in data:
            for key in item:
                if key not in all_columns:
                    all_columns.append(key)

        return {
            "success": True,
            "analysis_type": analysis_type,
            "row_count": len(data),
            "columns": all_columns
        }

    except Exception as error:
        print("Error in tool_analyze_results:", error)
        return {"success": False, "error": str(error)}


# --- TOOL 3: GENERATE REPORT ---
def tool_generate_report(title, sections, user_name="User", target_role=""):
    try:
        # build the report line by line
        lines = []

        # add big title at the top
        lines.append("# " + title)
        lines.append("")

        # add user info if we have it
        if user_name != "User" or target_role != "":
            lines.append("**Prepared for:** " + user_name)
            if target_role != "":
                lines.append("**Target Role:** " + target_role)
            lines.append("")

        # add each section
        for section in sections:
            heading = section.get("heading", "Section")
            content = section.get("content", "")

            lines.append("## " + heading)
            lines.append("")
            lines.append(content)
            lines.append("")

        # join all lines together
        report = ""
        for line in lines:
            if line is not None:
                report = report + line + "\n"

        # count words
        word_count = len(report.split())

        return {
            "success": True,
            "report": report,
            "word_count": word_count
        }

    except Exception as error:
        print("Error in tool_generate_report:", error)
        return {"success": False, "error": str(error)}


# --- TOOL 4: GENERATE CHART ---

# color settings for the dark theme
# i picked these to match the app dashboard colors
BG_DARK = "#0f172a"
PANEL_DARK = "#1e293b"
BORDER_DARK = "#334155"
TEXT_MUTED = "#94a3b8"
TEXT_WHITE = "#f8fafc"
ACCENT = "#38bdf8"


def tool_generate_chart(chart_type, labels, values, title="Chart", x_label="", y_label="", color_scheme="viridis"):
    # check chart type is valid
    valid_types = ["bar", "horizontal_bar", "pie", "line"]
    type_is_valid = False
    for valid in valid_types:
        if chart_type == valid:
            type_is_valid = True
            break

    if not type_is_valid:
        return {
            "success": False,
            "error": "Unsupported chart_type: '" + chart_type + "'. Use bar, horizontal_bar, pie, or line."
        }

    # check labels and values exist
    if len(labels) == 0 or len(values) == 0:
        return {"success": False, "error": "Both labels and values must be non-empty lists."}

    # check they are same length
    if len(labels) != len(values):
        return {
            "success": False,
            "error": "labels (" + str(len(labels)) + ") and values (" + str(len(values)) + ") must be the same length."
        }

    try:
        # get the color map - viridis is the default
        # getattr lets us get a property by name as a string
        cmap = getattr(plt.cm, color_scheme, plt.cm.viridis)

        # build a list of colors, one per label
        colors = []
        n = len(labels) - 1
        if n < 1:
            n = 1

        i = 0
        while i < len(labels):
            color = cmap(i / n)
            colors.append(color)
            i = i + 1

        # create the figure and axes
        fig, ax = plt.subplots(figsize=(10, 6))
        fig.patch.set_facecolor(BG_DARK)
        ax.set_facecolor(PANEL_DARK)

        # draw the right type of chart
        if chart_type == "bar":
            bars = ax.bar(labels, values, color=colors, edgecolor=BORDER_DARK, linewidth=0.8)
            ax.bar_label(bars, fmt="%.1f", padding=4, color=TEXT_WHITE, fontsize=9)

        elif chart_type == "horizontal_bar":
            bars = ax.barh(labels, values, color=colors, edgecolor=BORDER_DARK, linewidth=0.8)
            ax.bar_label(bars, fmt="%.1f", padding=4, color=TEXT_WHITE, fontsize=9)

        elif chart_type == "pie":
            wedges, texts, autotexts = ax.pie(
                values,
                labels=labels,
                colors=colors,
                autopct="%1.1f%%",
                pctdistance=0.8,
                startangle=90
            )
            # style the text on the pie
            for t in texts:
                t.set_color(TEXT_MUTED)
            for at in autotexts:
                at.set_color(TEXT_WHITE)
                at.set_fontsize(9)

        elif chart_type == "line":
            # make x positions as a list of numbers
            x_pos = []
            i = 0
            while i < len(labels):
                x_pos.append(i)
                i = i + 1

            ax.plot(
                x_pos, values,
                color=ACCENT,
                linewidth=2.5,
                marker="o",
                markersize=6,
                markerfacecolor="#0ea5e9",
                markeredgecolor=BG_DARK,
                markeredgewidth=1.5
            )
            ax.fill_between(x_pos, values, alpha=0.12, color=ACCENT)

            # set tick labels
            ax.set_xticks(x_pos)

            # rotate labels if there are lots of them
            if len(labels) > 5:
                rotation_angle = 30
            else:
                rotation_angle = 0

            ax.set_xticklabels(labels, rotation=rotation_angle, ha="right", color=TEXT_MUTED, fontsize=9)

        # style the chart title and axes labels
        ax.set_title(title, color=TEXT_WHITE, fontsize=14, fontweight="bold", pad=16)

        if x_label != "":
            ax.set_xlabel(x_label, color=TEXT_MUTED, fontsize=11)

        if y_label != "":
            ax.set_ylabel(y_label, color=TEXT_MUTED, fontsize=11)

        # style the tick marks
        ax.tick_params(axis="both", colors=TEXT_MUTED, labelsize=9)

        # style the border lines around the chart
        for spine in ax.spines.values():
            spine.set_edgecolor(BORDER_DARK)

        # for bar charts, rotate x labels if needed
        if chart_type == "bar":
            tick_positions = []
            i = 0
            while i < len(labels):
                tick_positions.append(i)
                i = i + 1

            ax.set_xticks(tick_positions)

            if len(labels) > 5:
                rotation_angle = 30
            else:
                rotation_angle = 0

            ax.set_xticklabels(labels, rotation=rotation_angle, ha="right", color=TEXT_MUTED, fontsize=9)

        # make everything fit nicely
        plt.tight_layout()

        # save the chart to memory as a png image
        buffer = io.BytesIO()
        fig.savefig(buffer, format="png", dpi=120, facecolor=fig.get_facecolor())
        plt.close(fig)

        # go back to start of buffer so we can read it
        buffer.seek(0)

        # convert image bytes to base64 string so we can send it as text
        image_bytes = buffer.read()
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        return {
            "success": True,
            "image_base64": image_b64,
            "mime_type": "image/png",
            "chart_type": chart_type,
            "title": title
        }

    except Exception as error:
        print("Error in tool_generate_chart:", error)
        plt.close("all")  # close any open charts to free memory
        return {"success": False, "error": str(error)}