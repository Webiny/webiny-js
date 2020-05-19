import React from "react";
import Input from "./Input";
import { Grid, Cell } from "@webiny/ui/Grid";
import { getCurrentDateString, appendTextToLabel } from "./utils";

const DEFAULT_TIME = "00:00:00";
const DEFAULT_DATE = getCurrentDateString();

const DateTimeWithoutTimezone = props => {
    // "2020-05-18 09:00:00"
    const [date, setDate] = React.useState("");
    const [time, setTime] = React.useState("");
    React.useEffect(() => {
        if (props.bind.value === null) {
            setDate(DEFAULT_DATE);
            setTime(DEFAULT_TIME);
            return;
        }
        const [isoDate, fullTime] = props.bind.value.split(" ");

        const formattedDate = isoDate;
        const formattedTime = fullTime;

        // Set previously saved values
        if (date !== formattedDate) {
            setDate(formattedDate);
        }
        if (time !== formattedTime) {
            setTime(formattedTime);
        }
    }, [props.bind.value]);

    return (
        <Grid>
            <Cell span={6}>
                <Input
                    {...props}
                    bind={{
                        ...props.bind,
                        value: date,
                        onChange: value => {
                            setDate(value);
                            return props.bind.onChange(`${value} ${time}`);
                        }
                    }}
                    field={{
                        ...props.field,
                        label: appendTextToLabel(props.field.label, " date")
                    }}
                    type={"date"}
                />
            </Cell>
            <Cell span={6}>
                <Input
                    {...props}
                    bind={{
                        ...props.bind,
                        value: time,
                        onChange: value => {
                            setTime(`${value}:00`);
                            return props.bind.onChange(`${date} ${value}:00`);
                        }
                    }}
                    field={{
                        ...props.field,
                        label: appendTextToLabel(props.field.label, " time")
                    }}
                    type={"time"}
                />
            </Cell>
        </Grid>
    );
};

export default DateTimeWithoutTimezone;
