<script>
    import Chart from "svelte-frappe-charts";

    export let rawMonthData;

    console.log(rawMonthData);

    const monthData = [
        {
            values: rawMonthData,
        },
    ];

    let data = {
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
        datasets: monthData,
    };
</script>

<Chart type="bar" {data} />
