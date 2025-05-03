<script>
    import { currentPoint } from "$lib";
    import Chart from "svelte-frappe-charts";
    let data;
    currentPoint.subscribe((point) => {
        if (!point.properties) {
            return;
        }
        
        const monthData = [
            {
                values: JSON.parse(point.properties.monthTicks),
            },
        ];
        data = {
            labels: [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ],
            datasets: monthData
        };

    });
</script>

<Chart type="bar" {data} />
